#!/bin/zsh
cd -- "$(dirname -- "$0")"
python3 - <<'PYLAUNCH'
import http.server, functools, os, webbrowser, threading
handler=functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.getcwd())
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
url=f'http://127.0.0.1:{server.server_address[1]}/Report.html'
print('Touchline Agility 99 V1.1 local review: '+url,flush=True)
print('Keep this window open while playing. Press Control-C to stop.',flush=True)
threading.Timer(.4,lambda:webbrowser.open(url)).start()
try: server.serve_forever()
except KeyboardInterrupt: pass
finally: server.server_close()
PYLAUNCH
