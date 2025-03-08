import {
    Link,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
} from "@heroui/react"

export function Header() {
    return (
        <Navbar>
            <NavbarBrand>
                <Link
                    color="foreground"
                    href="/"
                    className={'text-lg font-semibold'}
                >
                    Fx64b.dev
                </Link>
            </NavbarBrand>
            <NavbarContent justify={'end'}>
                <NavbarItem>
                    <Link color="foreground" href="/blog" className={'text-lg'}>
                        Blog
                    </Link>
                </NavbarItem>
            </NavbarContent>
        </Navbar>
    )
}
