import re, requests, json

headers : dict[str, str] = {'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'}

class TeraboxSession():

    def __init__(self, cookie:str='') -> None:

        self.r = requests.Session()
        self.isLogin = False
        self.cookie = cookie
        self.headers : dict[str,str] = headers
        self.user_id = json.loads(open('backend/json/config.json', 'r').read())['user_id']
        self.params = {'app_id':'250528', 'web':'1', 'channel':'dubox', 'clienttype':'5', 'dp-logid':'', 'client':'web', 'pass_version':'2.8', 'lang':'id', 'need_relation':'0', 'need_secret_info':'1', 'clientfrom':'h5'}

        try: self.generateAuth()
        except: pass

    def generateAuth(self) -> None:

        req = self.r.get('https://dm.terabox.com/indonesian/main?category=all', headers=self.headers, cookies={'cookie':self.cookie}, allow_redirects=True).text.replace('\\','')
        self.params.update({
            'jsToken':re.search(r'%28%22(.*?)%22%29',str(req)).group(1),
            'pcftoken':re.search(r'"pcftoken":"(.*?)"',str(req)).group(1),
            'user_list':f'["{self.user_id}"]',
            'bdstoken':re.search(r'"bdstoken":"(.*?)"',str(req)).group(1)})
        url = 'https://dm.terabox.com/api/user/getinfo?' + '&'.join([f'{a}={b}' for a,b in self.params.items()])
        pos = self.r.get(url, headers=self.headers, cookies={'cookie':self.cookie}).json()
        self.isLogin = True if len(pos.get('records', [])) != 0 else False

class TeraboxFile():

    #--> Initialization (requests, headers, and result)
    def __init__(self) -> None:

        self.r : object = requests.Session()
        self.cookie = json.loads(open('backend/json/config.json', 'r').read())['cookie']
        self.headers : dict[str,str] = headers

        self.folder_params = {'app_id':'250528', 'dp-logid':'', 'web':'1', 'channel':'dubox', 'clienttype':'0', 'root':'1', 'scene':''}
        self.file_params = {'app_id':'250528', 'dp-logid':'', 'web':'1', 'channel':'dubox', 'clienttype':'0', 'page':'1', 'num':'1000', 'by':'name', 'order':'asc', 'site_referer':''}

        self.result : dict[str,any] = {'status':'failed', 'js_token':'', 'browser_id':'', 'cookie':'', 'sign':'', 'timestamp':'', 'shareid':'', 'uk':'', 'list':[]}

    #--> Main control (get short_url, init authorization, and get root file)
    def search(self, url:str) -> None:

        req : str = self.r.get(url, allow_redirects=True)
        self.short_url : str = re.search(r'surl=([^ &]+)',str(req.url)).group(1)
        self.getAuthorization()
        self.getMainFile()

    #--> Get 'jsToken' & 'browserid' for cookies
    def getAuthorization(self) -> None:

        url = f'https://www.terabox.app/wap/share/filelist?surl={self.short_url}'
        req : str = self.r.get(url, headers=self.headers, cookies={'cookie':self.cookie}, allow_redirects=True)
        js_token = re.search(r'%28%22(.*?)%22%29',str(req.text.replace('\\',''))).group(1)
        browser_id = req.cookies.get_dict().get('browserid')

        self.result['js_token'] = js_token
        self.result['browser_id'] = browser_id
        self.result['cookie'] = self.cookie

    #--> Get payload (root / top layer / overall data) and init packing file information
    def getMainFile(self) -> None:
        params = {'jsToken':self.result['js_token'], 'shorturl':'1' + self.short_url, **self.folder_params}
        url = 'https://dm.terabox.com/api/shorturlinfo?' + '&'.join([f'{a}={b}' for a,b in params.items()])
        req : object = self.r.get(url, headers=self.headers, cookies={'cookie':''}).json()
        if req.get('list'):
            self.result['sign']      = req['sign']
            self.result['timestamp'] = req['timestamp']
            self.result['shareid']   = req['shareid']
            self.result['uk']        = req['uk']
            all_file = self.packData(req)
            if len(all_file):
                self.result['list']   = all_file
                self.result['status'] = 'success'

    #--> Get child file data recursively (if any) and init packing file information
    def getChildFile(self, path:str) -> list[dict[str, any]]:
        params = {'jsToken':self.result['js_token'], 'shorturl':self.short_url, 'dir':path, **self.file_params}
        url = 'https://dm.terabox.com/share/list?' + '&'.join([f'{a}={b}' for a,b in params.items()])
        req : object = self.r.get(url, headers=self.headers, cookies={'cookie':self.cookie}).json()
        return(self.packData(req))

    #--> Pack each file information
    def packData(self, req:dict) -> list[dict[str, any]]:
        all_file = [{
            'is_dir' : item['isdir'],
            'path'   : item['path'],
            'fs_id'  : item['fs_id'],
            'name'   : item['server_filename'],
            'size'   : item.get('size') if not bool(int(item.get('isdir'))) else 0,
            'image'  : item.get('thumbs').get('url3') if not bool(int(item.get('isdir'))) else '',
            'link'   : item.get('dlink') if not bool(int(item.get('isdir'))) else '',
            'list'   : self.getChildFile(item['path']) if item.get('isdir') else [],
        } for item in req.get('list', [])]
        return(all_file)

class TeraboxLink():

    #--> Initialization (requests, headers, payload, and result)
    def __init__(self, url:str) -> None:

        self.result : dict[str,dict] = {'status':'failed', 'download_link':{}}
        self.result['download_link'].update({'url_1':url})
        self.generate(url)
        self.result['status'] = 'success'

    #--> Generate fast download link
    def generate(self, url:str) -> None:
        
        r = requests.Session()
        try:
            old_url    : str = r.head(url, allow_redirects=True).url
            old_domain : str = re.search(r'://(.*?)\.',str(old_url)).group(1)
            medium_url : str = old_url.replace('by=themis', 'by=dapunta')
            fast_url   : str = old_url.replace(old_domain,'d3').replace('by=themis', 'by=dapunta')
            self.result['download_link'].update({'url_2':medium_url, 'url_3':fast_url})
        except: pass
        r.close()

class Test():

    def __init__(self) -> None:
        pass
    
    def session(self) -> None:
        
        cookie = json.loads(open('backend/json/config.json', 'r').read())['cookie']
        TS = TeraboxSession(cookie)
        print(TS.isLogin)

    def file(self) -> None:

        # url = 'https://1024terabox.com/s/1eBHBOzcEI-VpUGA_xIcGQg' #-> Ganti aja
        url = 'https://dm.terabox.com/indonesian/sharing/link?surl=KKG3LQ7jaT733og97CBcGg' #-> Ganti aja

        TF = TeraboxFile()
        TF.search(url)

        print(TF.result)
        open('backend/json/test_file.json', 'w', encoding='utf-8').write(str(TF.result))

    def link(self) -> None:
        
        url = 'https://dm-d.terabox.com/file/d60f9678d81d4dcb789aa266b5e55ad1?fid=4400994387999-250528-310338099799218&dstime=1730663606&rt=sh&sign=FDtAER-DCb740ccc5511e5e8fedcff06b081203-Tc3xwtn8tL2Al5BYLVCqeMpvKt0%3D&expires=8h&chkv=0&chkbd=0&chkpc=&dp-logid=229620269171703614&dp-callid=0&r=283785214&sh=1&region=jp'
        TL = TeraboxLink(url)
        print(TL.result)
        open('backend/json/test_link.json', 'w', encoding='utf-8').write(str(TL.result))

if __name__ == '__main__':

    T = Test()
    # T.session()
    # T.file()
    # T.link()

# [ Reference ]
# Scraping sendiri bosku