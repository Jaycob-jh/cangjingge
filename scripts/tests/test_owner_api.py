import concurrent.futures,importlib.util,json,tempfile,threading,time,unittest,urllib.error,urllib.request
from pathlib import Path
from unittest.mock import patch
SPEC=importlib.util.spec_from_file_location('owner_api',Path(__file__).resolve().parents[2]/'server/owner_api.py')
m=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(m)
def config(folder):return {'enabled':True,'base_url':'http://127.0.0.1:8860','github_owner_id':'123','github_client_id':'test-client','github_client_secret':'test-secret','session_secret':'s'*48,'openai_api_key':'fake-key-not-real','config_dir':Path(folder),'daily_calls':20,'monthly_calls':100,'monthly_input_tokens':200000,'monthly_output_tokens':20000,'max_input_tokens':12000,'max_output_tokens':1000,'monthly_usd_limit':2}
class Tests(unittest.TestCase):
 def setUp(self):
  folder=m.ROOT.parent/'cangjingge-work/owner-api-tests';folder.mkdir(parents=True,exist_ok=True);self.tmp=tempfile.TemporaryDirectory(dir=folder);self.addCleanup(self.tmp.cleanup);self.c=config(self.tmp.name);self.ledger=m.Ledger(Path(self.tmp.name)/'usage.sqlite3',self.c)
 def test_signatures_owner_and_expiry(self):
  value={'kind':'session','uid':'123','exp':time.time()+60,'csrf':'csrf'};token=m.sign(self.c,value);self.assertEqual(m.require_owner(self.c,token)['uid'],'123')
  for bad in [token+'x',m.sign(self.c,{**value,'uid':'456'}),m.sign(self.c,{**value,'exp':0}),m.sign(self.c,{**value,'kind':'oauth'})]:
   with self.assertRaises(m.Denied):m.require_owner(self.c,bad)
 def test_limits_and_restart(self):
  self.c['daily_calls']=1;self.ledger.reserve('one',10,10)
  with self.assertRaises(m.Quota):m.Ledger(self.ledger.path,self.c).reserve('two',10,10)
 def test_concurrent_reservations(self):
  self.c['daily_calls']=2
  def attempt(i):
   try:self.ledger.reserve(str(i),10,10);return True
   except m.Quota:return False
  with concurrent.futures.ThreadPoolExecutor(max_workers=8)as pool:self.assertEqual(sum(pool.map(attempt,range(12))),2)
 def test_token_and_money_caps(self):
  for field,value in [('monthly_input_tokens',5),('monthly_output_tokens',5),('monthly_usd_limit',0.000001)]:
   c=config(self.tmp.name);c[field]=value;l=m.Ledger(Path(self.tmp.name)/(field+'.sqlite3'),c)
   with self.assertRaises(m.Quota):l.reserve('test',10,10)
 def test_cache_and_exact_source_validation(self):
  source=m.evidence_for(['tian-2016']);sid=next(iter(source));quote=source[sid]['text'];answer={'claims':[{'source_id':sid,'quote':quote}]}
  calls=[]
  def request(url,payload,headers):
   calls.append((url,payload));return {'output':[{'type':'message','content':[{'type':'output_text','text':json.dumps(answer)}]}],'usage':{'input_tokens':100,'output_tokens':20}}
  result=m.ask(self.c,self.ledger,'研究对象',['tian-2016'],request);self.assertEqual(result['claims'][0]['quote'],quote);self.assertFalse(result['cached'])
  self.assertTrue(m.ask(self.c,self.ledger,'研究对象',['tian-2016'],request)['cached']);self.assertEqual(len(calls),1)
  self.assertEqual(calls[0][1]['store'],False);self.assertNotIn('tools',calls[0][1]);self.assertEqual(calls[0][1]['model'],m.MODEL)
  for invalid in [{'claims':[{'source_id':'invented','quote':'unknown'}]},{'claims':[{'source_id':sid,'quote':'脑内剂量99999 J/cm2'}]}]:
   with self.assertRaises(m.Denied):m.validate_answer(invalid,source)
 def test_timeout_is_not_retried(self):
  def timeout(*a):raise TimeoutError()
  with self.assertRaises(TimeoutError):m.ask(self.c,self.ledger,'研究对象',['tian-2016'],timeout)
  with self.assertRaises(m.Denied):m.ask(self.c,self.ledger,'研究对象',['tian-2016'],lambda*a:self.fail('must not retry'))
  self.assertEqual(self.ledger.usage()['calls'],1)
 def test_no_key_disabled_unknown_card(self):
  for c in [{**self.c,'enabled':False},{**self.c,'openai_api_key':''}]:
   with patch.dict(m.os.environ,{'OPENAI_API_KEY':''}):
    with self.assertRaises(m.Denied):m.ask(c,self.ledger,'研究对象',['tian-2016'],lambda*a:self.fail('network'))
  with self.assertRaises(m.Denied):m.evidence_for(['../../private'])
  self.assertEqual(self.ledger.usage()['calls'],0)
 def test_http_authorization_and_csrf(self):
  server=m.ThreadingHTTPServer(('127.0.0.1',0),m.Handler);self.addCleanup(server.server_close);self.c['base_url']='http://127.0.0.1:'+str(server.server_port);server.config=self.c;server.ledger=self.ledger
  t=threading.Thread(target=server.serve_forever,daemon=True);t.start();self.addCleanup(server.shutdown)
  def post(cookie='',origin=None,csrf=''):
   req=urllib.request.Request(self.c['base_url']+'/api/ask',data=b'{}',headers={'Cookie':'cg_session='+cookie,'Origin':origin or self.c['base_url'],'X-CSRF-Token':csrf})
   try:return urllib.request.urlopen(req).status
   except urllib.error.HTTPError as e:
    status=e.code;e.close();return status
  with patch.object(m,'ask',side_effect=AssertionError('unauthorized upstream')):
   self.assertEqual(post(),403)
   other=m.sign(self.c,{'kind':'session','uid':'456','exp':time.time()+60,'csrf':'csrf'});self.assertEqual(post(other,csrf='csrf'),403)
   owner=m.sign(self.c,{'kind':'session','uid':'123','exp':time.time()+60,'csrf':'csrf'});self.assertEqual(post(owner,origin='https://attacker.invalid',csrf='csrf'),403);self.assertEqual(post(owner,csrf='wrong'),403)
  self.assertEqual(self.ledger.usage()['calls'],0)
 def test_github_callback_owner_and_other_account(self):
  from urllib.parse import urlsplit,parse_qs,urlencode
  from http.cookies import SimpleCookie
  server=m.ThreadingHTTPServer(('127.0.0.1',0),m.Handler);self.addCleanup(server.server_close);self.c['base_url']='http://127.0.0.1:'+str(server.server_port);server.config=self.c;server.ledger=self.ledger
  threading.Thread(target=server.serve_forever,daemon=True).start();self.addCleanup(server.shutdown)
  class NoRedirect(urllib.request.HTTPRedirectHandler):
   def redirect_request(self,*args):return None
  opener=urllib.request.build_opener(NoRedirect)
  def get(path,cookie=''):
   try:
    with opener.open(urllib.request.Request(self.c['base_url']+path,headers={'Cookie':cookie}))as response:return response.status,response.headers,response.read()
   except urllib.error.HTTPError as e:
    status,headers,body=e.code,e.headers,e.read();e.close();return status,headers,body
  status,headers,_=get('/login');self.assertEqual(status,303);query=parse_qs(urlsplit(headers['Location']).query);self.assertEqual(query['scope'],['read:user']);self.assertEqual(query['code_challenge_method'],['S256'])
  state_cookie=SimpleCookie();state_cookie.load(headers['Set-Cookie']);cookie='cg_state='+state_cookie['cg_state'].value
  with patch.object(m,'json_request',side_effect=AssertionError('bad state must not access provider')):self.assertEqual(get('/callback?state=wrong&code=none',cookie)[0],403)
  for uid,expected in [('456',403),('123',303)]:
   calls=[]
   def upstream(url,payload=None,headers=None):
    calls.append(url)
    if url.endswith('/access_token'):
     self.assertTrue(payload['code_verifier']);return {'access_token':'fake-github-token'}
    return {'id':uid}
   with patch.object(m,'json_request',side_effect=upstream):
    status,headers,body=get('/callback?'+urlencode({'state':query['state'][0],'code':'fake-code'}),cookie);self.assertEqual(status,expected);self.assertEqual(len(calls),2)
    self.assertNotIn(b'fake-github-token',body)
    if uid=='123':
     session=SimpleCookie();session.load(headers.get_all('Set-Cookie')[0]);value=session['cg_session'].value;self.assertEqual(m.require_owner(self.c,value)['uid'],'123');self.assertIn('HttpOnly',headers.get_all('Set-Cookie')[0])
 def test_private_config_and_remote_https(self):
  with self.assertRaises(m.Denied):m.load_config(m.ROOT/'secrets/config.json')
  c={k:v for k,v in self.c.items()if k!='config_dir'};c['base_url']='http://public.invalid';p=Path(self.tmp.name)/'cfg.json';p.write_text(json.dumps(c),encoding='utf8')
  with self.assertRaises(m.Denied):m.load_config(p)
 def test_no_evidence_is_not_invented(self):
  self.assertTrue(m.validate_answer({'claims':[]},m.evidence_for(['tian-2016']))['insufficient'])
if __name__=='__main__':unittest.main()
