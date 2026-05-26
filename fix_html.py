import os
import glob

directory = "/Users/jamesnikkohosana/Downloads/bantay72/SuperAdmin/src"
html_files = glob.glob(os.path.join(directory, "*.html"))

old_script = '<script>if(localStorage.getItem("user_email")==="bantayteam72.admin@gmail.com"){document.write("<style>a[href*=\\"analytics_and_reports.html\\"], a[href*=\\"user-management.html\\"] { display: none !important; }</style>");}</script>'
new_script = '<script>if(localStorage.getItem("user_email")==="bantayteam72.admin@gmail.com" || sessionStorage.getItem("user_id")==="fGR7io5X2YfXcNqKA65HE8zYQfA2"){document.write("<style>a[href*=\\"analytics_and_reports.html\\"], a[href*=\\"user-management.html\\"] { display: none !important; }</style>");}</script>'

for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
    
    if old_script in content:
        content = content.replace(old_script, new_script)
    else:
        # If it doesn't have the old script, maybe we can just replace </head>
        content = content.replace('</head>', new_script + '</head>')
        
    with open(file, 'w') as f:
        f.write(content)

print("Done updating HTML files.")
