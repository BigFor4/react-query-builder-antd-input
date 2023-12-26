export default
{
  "title": "AND",
  "type": "operator",
  "children": [
    {
      "title": "Attribute.Length < 100",
      "type": "attribute"
    },
    {
      "title": "Attribute.Height > 200",
      "type": "attribute"
    },
    {
      "title": "AND",
      "type": "operator",
      "children": [
        {
          "title": "Attribute.Width > 100",
          "type": "attribute"
        },
        {
          "title": "OR",
          "type": "operator",
          "children": [
            {
              "title": "Attribute.Value < 100",
              "type": "attribute"
            },
            {
              "title": "Attribute.Volume > 100",
              "type": "attribute"
            }
          ]
        }
      ]
    }
  ]
};