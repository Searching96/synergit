package utils

import (
	"fmt"
	"strings"
	"synergit/internal/core/domain"
	"time"
)

func NormalizeRepositoryCreateOptions(
	options domain.CreateRepositoryOptions) (domain.CreateRepositoryOptions, error) {

	normalized := options
	normalized.Description = strings.TrimSpace(options.Description)
	normalized.GitignoreTemplate = strings.ToLower(strings.TrimSpace(options.GitignoreTemplate))
	normalized.LicenseTemplate = strings.ToLower(strings.TrimSpace(options.LicenseTemplate))
	normalized.Visibility = domain.RepoVisibility(strings.TrimSpace(string(options.Visibility)))

	if normalized.Visibility == "" {
		normalized.Visibility = domain.RepoVisibilityPublic
	}

	if err := domain.ValidateRepoVisibility(normalized.Visibility); err != nil {
		return domain.CreateRepositoryOptions{}, err
	}

	if normalized.GitignoreTemplate == "none" {
		normalized.GitignoreTemplate = ""
	}

	if normalized.LicenseTemplate == "none" {
		normalized.LicenseTemplate = ""
	}

	return normalized, nil
}

func BuildRepositoryBootstrapFiles(repoName string, ownerName string,
	options domain.CreateRepositoryOptions) map[string]string {

	files := map[string]string{}

	if options.InitializeReadme {
		files["README.md"] = buildRepositoryReadmeContent(repoName, options.Description)
	}

	if gitignore, ok := resolveGitignoreTemplateContent(options.GitignoreTemplate); ok {
		files[".gitignore"] = gitignore
	}

	if license, ok := resolveLicenseTemplateContent(options.LicenseTemplate, ownerName); ok {
		files["LICENSE"] = license
	}

	return files
}

func buildRepositoryReadmeContent(repoName string, description string) string {
	trimmedDescription := strings.TrimSpace(description)
	if trimmedDescription == "" {
		return fmt.Sprintf("# %s", repoName)
	}

	return fmt.Sprintf("# %s\n\n%s", repoName, trimmedDescription)
}

func resolveGitignoreTemplateContent(templateName string) (string, bool) {
	switch templateName {
	case "go":
		return "# Binaries\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n\n# Test binary\n*.test\n\n# Vendor\nvendor/\n\n# IDE\n.vscode/\n.idea/\n", true
	case "node", "nodejs":
		return "node_modules/\ndist/\nbuild/\ncoverage/\n.env\n.env.*\n.vscode/\n", true
	case "python":
		return "__pycache__/\n*.py[cod]\n*.pyo\n*.pyd\n.venv/\nvenv/\n.env\n.pytest_cache/\n", true
	case "java":
		return "target/\n*.class\n*.jar\n*.war\n.idea/\n.vscode/\n", true
	case "rust":
		return "target/\n**/*.rs.bk\nCargo.lock\n", true
	default:
		return "", false
	}
}

func resolveLicenseTemplateContent(templateName string,
	ownerName string) (string, bool) {

	year := time.Now().Year()

	switch templateName {
	case "mit":
		return fmt.Sprintf("MIT License\n\nCopyright (c) %d %s\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n", year, ownerName), true
	case "apache-2.0":
		return "Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nCopyright [year] [name of copyright owner]\n\nLicensed under the Apache License, Version 2.0 (the \"License\");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an \"AS IS\" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.\n", true
	case "gpl-3.0":
		return "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007\n\nCopyright (C) 2007 Free Software Foundation, Inc.\n\nThis program is free software: you can redistribute it and/or modify\nit under the terms of the GNU General Public License as published by\nthe Free Software Foundation, either version 3 of the License, or\n(at your option) any later version.\n\nThis program is distributed in the hope that it will be useful,\nbut WITHOUT ANY WARRANTY; without even the implied warranty of\nMERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the\nGNU General Public License for more details.\n\nYou should have received a copy of the GNU General Public License\nalong with this program. If not, see <https://www.gnu.org/licenses/>.\n", true
	default:
		return "", false
	}
}
