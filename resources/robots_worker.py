"""No network. JSON in/out so the desktop can package this as a tiny sidecar."""
import json
import sys
from protego import Protego

def run(data):
    parser = Protego.parse(data['text'])
    return [{'url':url,'bot':bot,'allowed':parser.can_fetch(url,bot)} for url in data['urls'] for bot in data['bots']]

if __name__ == '__main__':
    try:
        print(json.dumps(run(json.load(sys.stdin))))
    except Exception:
        print(json.dumps({'error':'robots parser failed'}))
        sys.exit(1)
