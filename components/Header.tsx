import {
    Link,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
} from '@nextui-org/react'

export function Header() {
    return (
        <Navbar>
            <NavbarBrand>
                <Link color="foreground" href="/">
                    Fx64b.dev
                </Link>
            </NavbarBrand>
            <NavbarContent justify={'end'}>
                <NavbarItem>
                    <Link color="foreground" href="/blog">
                        Blog
                    </Link>
                </NavbarItem>
            </NavbarContent>
        </Navbar>
    )
}
