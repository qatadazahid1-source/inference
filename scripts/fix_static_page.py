with open('src/pages/StaticPage.tsx', encoding='utf-8') as f:
    lines = f.readlines()
lines[209] = '          canonical={SITE_URL + "/" + slug}\n'
with open('src/pages/StaticPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed line 210')
