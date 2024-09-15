import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { PostMeta } from '@/types/post'

const postsDirectory = path.join(process.cwd(), 'content');

export function getPostSlugs(): string[] {
    return fs.readdirSync(postsDirectory).filter((file) => file.endsWith('.md'));
}

export function getPostBySlug(slug: string): PostMeta | null {
    const realSlug = slug.replace(/\.md$/, '');
    const fullPath = path.join(postsDirectory, `${realSlug}.md`);

    if (!fs.existsSync(fullPath)) {
        return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return {
        ...(data as PostMeta),
        slug: realSlug,
    };
}

export function getAllPosts(): PostMeta[] {
    const slugs = getPostSlugs();
    return slugs
        .map((slug) => getPostBySlug(slug))
        .filter((post): post is PostMeta => post !== null)
        .sort((a, b) => (a.date > b.date ? -1 : 1));
}
