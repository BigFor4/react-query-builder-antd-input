npm install -g json
json -I -f package.json \
  -e 'this.name="@BigFor4/react-query-builder-antd-input"' \
  -e 'this.repository.url="git://github.com/BigFor4/react-query-builder-antd-input.git"' \
  -e 'this.publishConfig={}' \
  -e 'this.publishConfig.registry="https://npm.pkg.github.com/"'
