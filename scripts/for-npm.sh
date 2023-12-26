npm install -g json
json -I -f package.json \
  -e 'this.name="react-query-builder-antd-input"' \
  -e 'this.repository.url="https://github.com/BigFor4/react-query-builder-antd-input.git"' \
  -e 'delete this.publishConfig'
