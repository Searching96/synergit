package main

import (
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	usecaseDir := "internal/core/usecase"
	outDir := "internal/core/boundary/input"

	os.MkdirAll(outDir, 0755)

	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, usecaseDir, nil, parser.ParseComments)
	if err != nil {
		panic(err)
	}

	for _, pkg := range pkgs {
		for fileName, f := range pkg.Files {
			if strings.HasSuffix(fileName, "_test.go") || filepath.Base(fileName) == "utils" {
				continue
			}

			// Find Service structs
			serviceNames := []string{}
			for _, decl := range f.Decls {
				if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
					for _, spec := range genDecl.Specs {
						if typeSpec, ok := spec.(*ast.TypeSpec); ok {
							if strings.HasSuffix(typeSpec.Name.Name, "Service") {
								serviceNames = append(serviceNames, typeSpec.Name.Name)
							}
						}
					}
				}
			}

			if len(serviceNames) == 0 {
				continue
			}

			var outBuf bytes.Buffer
			outBuf.WriteString("package input\n\n")

			outBuf.WriteString("import (\n")
			for _, imp := range f.Imports {
				outBuf.WriteString("\t" + imp.Path.Value + "\n")
			}
			outBuf.WriteString("\t\"synergit/internal/core/domain\"\n")
			outBuf.WriteString("\t\"synergit/internal/core/boundary/output\"\n")
			outBuf.WriteString(")\n\n")

			for _, srvName := range serviceNames {
				interfaceName := strings.TrimSuffix(srvName, "Service") + "UseCase"
				outBuf.WriteString(fmt.Sprintf("type %s interface {\n", interfaceName))

				for _, decl := range f.Decls {
					if funcDecl, ok := decl.(*ast.FuncDecl); ok && funcDecl.Recv != nil {
						if starExpr, ok := funcDecl.Recv.List[0].Type.(*ast.StarExpr); ok {
							if ident, ok := starExpr.X.(*ast.Ident); ok && ident.Name == srvName {
								if funcDecl.Name.IsExported() {
									var typeBuf bytes.Buffer
									printer.Fprint(&typeBuf, fset, funcDecl.Type)
									
									methodSig := strings.Replace(typeBuf.String(), "func", funcDecl.Name.Name, 1)
									methodSig = strings.ReplaceAll(methodSig, "port.", "output.")
									
									outBuf.WriteString(fmt.Sprintf("\t%s\n", methodSig))
								}
							}
						}
					}
				}
				outBuf.WriteString("}\n\n")
			}

			outFileName := filepath.Join(outDir, filepath.Base(fileName))
			os.WriteFile(outFileName, outBuf.Bytes(), 0644)
		}
	}
}
