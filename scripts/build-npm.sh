rm -rf lib

echo "1"
babel -d lib ./modules
echo "2"
sass css/:lib/css/ --no-source-map --style=expanded
echo "3"
cp css/antd.less lib/css/antd.less

cp modules/index.d.ts lib/index.d.ts
cp modules/config/antd/index.d.ts lib/config/antd/index.d.ts
cp modules/components/widgets/antd/index.d.ts lib/components/widgets/antd/index.d.ts
