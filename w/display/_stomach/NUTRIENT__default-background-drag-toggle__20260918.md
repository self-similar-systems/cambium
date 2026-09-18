# NUTRIENT — global default background-drag toggle

status: OPEN / UNRESOLVED
source: explicit user-designed cross-site invariant
date: 2026-09-18
target: github.cambium...display
owner: Display root

## requested invariant
Background tetrahedron drag/orientation should be a Display-global site-holon capability rather than a Philosophy/Papers special case.

Default for a newly admitted site-holon:
`background_drag = true`

Local opt-out:
`background_drag = false`

## scope
- the default belongs to Display/site-holon contract;
- the local value belongs to each site-holon's own membrane declaration;
- existing site-local phenomenology and semantic interaction remain local;
- disabling background drag must not disable global navigator orientation controls or remap site identity/address;
- central runtime must not branch on named site identities.

## exit condition
The generated Display membrane gives any site-holon background drag by default without requiring local enabling code, while a site-local explicit false disables only that site's background-drag interaction. The contract is structurally tested and browser-witnessed for default-true and explicit-false cases, then closes through Display HOME/_feed.
