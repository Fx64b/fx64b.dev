import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'

const techCategories = {
    Languages: ['JavaScript', 'TypeScript', 'Go', 'Java'],
    Frontend: ['React', 'Next.js', 'Tailwind CSS', 'Radix UI', 'Angular'],
    Backend: ['PostgreSQL', 'MongoDB', 'SQLite', 'Apache Kafka', 'Quarkus'],
    'Tools & Others': [
        'Docker',
        'Git',
        'Neovim',
        'GoLand',
        'WebStorm',
        'pnpm',
        'Node.js',
        'Vercel',
        'Fedora',
        'Manjaro',
    ],
}

interface TechStackSectionProps {
    className?: string
}

export function TechStackSection({ className }: TechStackSectionProps) {
    return (
        <Section className={className}>
            <div className="mb-8 text-center">
                <h2 className="mb-3 text-2xl font-bold tracking-tight">
                    Tech Stack
                </h2>
                <p className="text-muted-foreground mx-auto max-w-xl text-base">
                    Technologies I use to build my applications
                </p>
            </div>

            <div className="mx-auto max-w-3xl space-y-6">
                {Object.entries(techCategories).map(([category, techs]) => (
                    <div key={category}>
                        <h3 className="text-muted-foreground mb-2 text-center text-xs font-medium tracking-wider uppercase">
                            {category}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-2">
                            {techs.map((tech) => (
                                <Badge key={tech} variant="secondary">
                                    {tech}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex w-full justify-center">
                <Badge variant="outline" className="text-xs">
                    And many more...
                </Badge>
            </div>
        </Section>
    )
}
