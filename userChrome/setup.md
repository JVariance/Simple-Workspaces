### enable userChrome.css
- about:config: toolkit.legacyUserProfileCustomizations.stylesheets = true

### Bookmarks:
- svg files: fill="context-fill" instead of currentColor
- about:config: svg.context-properties.content.enabled = true
- specific element with custom icon (e.g. list-style-image): -moz-context-properties: fill, stroke(, ...)

#### SASS
	sass userChrome/scss/base.scss userChrome/userChrome.css