module.exports = {
  "extends": "airbnb",
  "env": {
    "node": true,
    "mocha": true
  },
  "parserOptions": {
    "ecmaVersion": 8,
    "sourceType": "module"
  },
  "rules": {
    "class-methods-use-this": [0
    ],
    "consistent-return": 0,
    "max-len": [2,
      {
        "code": 120
      }
    ],
    "no-console": 0,
    "no-undef": 0,
    "no-underscore-dangle": 0,
    "no-use-before-define": [2,
      {
        "functions": true,
        "classes": false
      }
    ],
    "no-unused-vars": [2,
      {
        "args": "all",
        "caughtErrors": "none"
      }
    ],
    "object-property-newline": [2,
      {
        "allowAllPropertiesOnSameLine": true
      }
    ],
    "one-var": 0,
    "prefer-destructuring": [0
    ]
  }
};
