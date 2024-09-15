import { getPostBySlug, getPostSlugs } from '../../lib/posts';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

interface Props {
    params: {
        slug: string;
    };
}

export async function generateStaticParams() {
    const slugs = getPostSlugs().map((slug) => slug.replace(/\.md$/, ''));
    return slugs.map((slug) => ({
        slug,
    }));
}

export default async function PostPage({ params }: Props) {
    const { slug } = params;
    const post = getPostBySlug(slug);

    if (!post) {
        return <p>Post not found.</p>;
    }

    const fullPath = path.join(process.cwd(), 'content', `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { content } = matter(fileContents);
    const processedContent = await remark().use(html).process(content);
    const contentHtml = processedContent.toString();

    return (
        <main>
            <h1>{post.title}</h1>
            <p>{post.date}</p>
            <article dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </main>
    );
}
