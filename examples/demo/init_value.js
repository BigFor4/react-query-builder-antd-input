export const treeInit =
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

export const treeProject = [
  {
    "title": "A",
    "key": "3ed079f2-798d-4049-a5c3-3108f59cfda9",
    "type": "FOLDER",
    "isDeleted": false,
    "accesscontrols": [],
    "parentKey": null,
    "isLeaf": false,
    "children": [
      {
        "title": "Folder B",
        "key": "bee2a7a7-0533-4679-8418-0d67e3f35429",
        "type": "FOLDER",
        "isDeleted": false,
        "accesscontrols": [],
        "parentKey": "3ed079f2-798d-4049-a5c3-3108f59cfda9",
        "children": [
          {
            "ext": ".ifc",
            "modelType": "ifc",
            "src": "https://obt-test-eu.s3.eu-west-1.amazonaws.com/655c8616c070a1001264a8f8/d57adef1-d472-4c72-982a-4f065044d5ac.ifc",
            "modelId": "659ba7bc84bbd70013f65188",
            "isLeaf": false,
            "hash": "655c8616c070a1001264a8f8/d57adef1-d472-4c72-982a-4f065044d5ac",
            "refId": "659ba7bc84bbd70013f65188",
            "isDeleted": false,
            "parentKey": "bee2a7a7-0533-4679-8418-0d67e3f35429",
            "sourceType": "local",
            "title": "UM.OU.RIB.PRA (Primærrenseanlegg).ifc",
            "type": "FILE",
            "key": "81cd8ccc-3761-4c11-8861-4159c89a9d76"
          }
        ],
        "isLeaf": false
      },
      {
        "ext": ".ifc",
        "modelType": "ifc",
        "src": "https://obt-test-eu.s3.eu-west-1.amazonaws.com/655c8616c070a1001264a8f8/c19de24a-953b-46fe-bc98-e9a9b62414f0.ifc",
        "modelId": "659bab6d84bbd70013f6518f",
        "isLeaf": false,
        "hash": "655c8616c070a1001264a8f8/c19de24a-953b-46fe-bc98-e9a9b62414f0",
        "refId": "659bab6d84bbd70013f6518f",
        "isDeleted": false,
        "parentKey": "3ed079f2-798d-4049-a5c3-3108f59cfda9",
        "sourceType": "local",
        "title": "01.B1.AKU.AB (Adminbygg).ifc",
        "type": "FILE",
        "key": "f96eace1-e718-4057-8f84-6e89b7f4d0be"
      },
      {
        "ext": ".ifc",
        "modelType": "ifc",
        "src": "https://obt-test-eu.s3.eu-west-1.amazonaws.com/655c8616c070a1001264a8f8/22a7ef22-c69b-46de-b10e-413e7738f34e.ifc",
        "modelId": "659bb4b784bbd70013f65197",
        "isLeaf": false,
        "hash": "655c8616c070a1001264a8f8/22a7ef22-c69b-46de-b10e-413e7738f34e",
        "refId": "659bb4b784bbd70013f65197",
        "isDeleted": false,
        "parentKey": "3ed079f2-798d-4049-a5c3-3108f59cfda9",
        "sourceType": "local",
        "title": "01.B1.AKU.AB (Adminbygg).ifc",
        "type": "FILE",
        "key": "096014d5-aec8-436e-a273-476237c28008"
      }
    ]
  }
]