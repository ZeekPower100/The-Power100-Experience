#!/usr/bin/env python3
"""Resolve mimeType for one or more Drive file IDs (Shared-Drive aware)."""
import json, sys
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

with open('/home/runcloud/thumbnail-system/google-drive-oauth-token.json') as f:
    tok = json.load(f)
with open('/home/runcloud/thumbnail-system/drive-client-secret.json') as f:
    cs = json.load(f)
inst = cs.get('installed') or cs.get('web')
creds = Credentials(
    token=tok.get('access_token'),
    refresh_token=tok.get('refresh_token'),
    token_uri='https://oauth2.googleapis.com/token',
    client_id=inst['client_id'],
    client_secret=inst['client_secret'],
    scopes=['https://www.googleapis.com/auth/drive.readonly'],
)
svc = build('drive', 'v3', credentials=creds)
for fid in sys.argv[1:]:
    info = svc.files().get(fileId=fid, fields='id,name,mimeType,size', supportsAllDrives=True).execute()
    print(f"{info['id']}\t{info['mimeType']}\t{info['name']}")
