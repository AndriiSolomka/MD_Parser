#!/bin/bash

echo "🚀 Running Markdown to PDF Converter Tests"
echo "=========================================="
echo ""

mkdir -p output
rm -f output/*

echo "📝 Automatically testing all .md files in test-md/..."
echo ""

success=0
failed=0

for input in test-md/*.md; do
  filename=$(basename "$input")
  output="output/${filename%.md}.pdf"
  
  echo "  Converting: $filename"
  
  if npm run cli -- "$input" -o "$output" > /dev/null 2>&1; then
    echo "  ✅ Success: $output"
    ((success++))
  else
    echo "  ❌ Failed: $filename"
    ((failed++))
  fi
  echo ""
done

echo "=========================================="
echo "📊 Results:"
echo "  ✅ Success: $success"
echo "  ❌ Failed: $failed"
echo "  📄 Total: $((success + failed))"
echo ""

if [ $failed -eq 0 ]; then
  echo "🎉 All tests passed successfully!"
  echo ""
  echo "Generated PDF files are in the folder: output/"
  echo "Open folder: open output/"
else
  echo "⚠️  Some tests failed. Check the errors above."
fi

echo ""
echo "Done! ✨"