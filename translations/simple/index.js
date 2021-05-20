// Simple Figma Extension to convert FRAME and TEXT layers
interplay.addExtension({
  id: 'jsx',
  name: 'JSX',
  type: 'CodeTranslation',
  syntax: 'jsx',
  // test is run to see if the extension can handle the translation
  // this can be a function of layer type
  test: ['FRAME', 'TEXT'],
  fn: (node, parent, getChildren, options) => {
    if(node.props.type === 'FRAME'){
      return FigmaFrame(node, parent, getChildren, options);
    }
    else {
      return FigmaText(node, parent, getChildren, options)
    }
  },
});


const FigmaText = (node, parent, getChildren, options) => {
  // options.getCSS is a helper function which returns css for a Figma node
  // this library will be open-sourced soon
  const { fontWeight, fontSize, lineHeight, color: colorValue } = options.getCSS(node, parent);

  // includes will be added to the top of the code snippet. 
  // The id field is used to prevent duplicates
  options.addInclude('Text', `import Text from '@interplayapp/mission/components/Text';`);


  // getTokens returns an object of tokens in the following format
  /*
    {
      'colors.black.100': {
        name: '100',
        path: 'colors.black.100',
        value: '#000000', // value has all aliases resolved
      },
      ... other tokens
    }
  */

  const tokens = options.getTokens();
  const nodeTokens = node.props.tokens || {};

  const weight = tokenNameOrValue(tokens, nodeTokens, 'fontWeight', fontWeight);
  const color = tokenNameOrValue(tokens, nodeTokens, 'color', colorValue);
  const size = tokenNameOrValue(tokens, nodeTokens, 'fontSize', fontSize + 'px');
  console.log({weights, color, size});

  const props = {
    weight,
    size,
    color,
  }
  if(lineHeight && lineHeight !== '1'){
    props.lineHeight = lineHeight;
  }

  const propsString = Object.keys(props).map((key) => `${key}="${props[key]}"`, '').join(" ");

  // return the translation...
  return `<Text ${propsString}>${node?.props?.characters}</Text>`;
}


const FigmaFrame = (node, parent, getChildren, options) => {
  const props = {};
  const tokens = options.getTokens();
  const css = options.getCSS(node, parent);
  
  // tokens prop holds the tokens which were aplied to the layer in the plugin
  // the key is the css prop it was applied to, and the value is the token path (e.g. colors.black.100)
  const nodeTokens = node.props.tokens || {};

  Object.keys(css).forEach(key => {
    if(!css[key] || mootValues.includes(css[key]) || mootProps.includes(key)){
      // ignore certain css props for now.
      delete css[key];
    }
    else if(styleToFrameProp[key]){
      // convert known style attributes to props
      const propName = styleToFrameProp[key];
      props[propName] = tokenNameOrValue(tokens, nodeTokens, key, css[key]);
      delete css[key];
    }    
  });
  
  const styleString = Object.keys(css).map(key => `${key}: '${css[key]}'`).join(', ');
  let propString = Object.keys(props).map(key => `${key}="${props[key]}"`).join(' ');
  if(styleString.length){
    propString += ` style={{${styleString}}}`;
  }

  if(node.props.layoutMode === "NONE"){
    options.addInclude('Box', `import Box from '@interplapp/mission/components/Box';`);
    return `<Box ${propString}>${getChildren().join('')}</Box>`;  
  }
  else {
    options.addInclude('Stack', `import Stack from '@interplapp/mission/components/Stack';`);
    return `<Stack ${propString}>${getChildren().join('')}</Stack>`;  
  }
}

console.log("UPDATED TRANSLATION...");

// helper functions
const tokenNameOrValue = (tokens, nodeTokens, type, value) => {
  console.log({tokens, nodeTokens, type, value})
  if(nodeTokens[type]){
    // if a token was applied to this node, use it 
    console.log({nodeTokensType: nodeTokens[type]})
    return nodeTokens[type];
  }
  // try to find the token by value
  const token = Object.values(tokens).find(t => t.type === type && t.value === value);

  return token ? token.path : value;
}

const mootValues = ['normal', 'unset'];
const mootProps = ['bottom', 'display', 'height', 'left', 'minHeight', 'minWidth', 'overflow', 'position', 'right', 'top', 'width', 'boxSizing'];

const styleToFrameProp = {
  backgroundColor: 'bg',
  boxShadow: 'shadow',
  padding: 'p',
  gap: 'gap',
  margin: 'm',
  border: 'b',
  justifyContent: 'justifyContent',
  alignItems: 'alignItems',
  borderRadius: 'borderRadius',
  justifyItems: 'justifyItems',
  flexDirection: 'flexDirection'
};