#!/bin/bash

FILES=(
  "src/components/activities/ActivityDetailClient.jsx"
  "src/components/activities/ActivityFilters.jsx"
  "src/components/activities/ActivityBookingWidget.jsx"
)

for file in "${FILES[@]}"; do
  sed -i 's/bg-white/bg-card/g' "$file"
  sed -i 's/border-gray-300/border-border/g' "$file"
  sed -i 's/border-gray-200/border-border/g' "$file"
  sed -i 's/border-gray-100/border-border/g' "$file"
  sed -i 's/bg-gray-200/bg-muted/g' "$file"
  sed -i 's/bg-gray-100/bg-muted/g' "$file"
  sed -i 's/bg-gray-50/bg-muted/g' "$file"
  sed -i 's/text-gray-900/text-foreground/g' "$file"
  sed -i 's/text-gray-800/text-foreground/g' "$file"
  sed -i 's/text-gray-700/text-muted-foreground/g' "$file"
  sed -i 's/text-gray-600/text-muted-foreground/g' "$file"
  sed -i 's/text-gray-500/text-muted-foreground/g' "$file"
  sed -i 's/text-gray-400/text-muted-foreground/g' "$file"
  sed -i 's/hover:text-gray-700/hover:text-foreground/g' "$file"
  sed -i 's/hover:border-gray-300/hover:border-border/g' "$file"
  sed -i 's/hover:bg-gray-50/hover:bg-muted/g' "$file"
  sed -i 's/divide-gray-100/divide-border/g' "$file"
  sed -i 's/disabled:bg-gray-300/disabled:bg-muted/g' "$file"
done
