import { componentToReact } from '../generators/react';
import { parseJsx } from '../parsers/jsx';
const basic = require('./data/basic.raw');
const basicMitosis = require('./data/basic-custom-mitosis-package.raw');
const basicChildComponent = require('./data/basic-child-component.raw');
const basicFor = require('./data/basic-for.raw');
const basicRef = require('./data/basic-ref.raw');
const basicForwardRef = require('./data/basic-forwardRef.raw');
const basicForwardRefMetadata = require('./data/basic-forwardRef-metadata.raw');
const basicRefPrevious = require('./data/basic-ref-usePrevious.raw');
const basicRefAssignment = require('./data/basic-ref-assignment.raw');
const submitButtonBlock = require('./data/blocks/submit-button.raw');
const inputBlock = require('./data/blocks/input.raw');
const selectBlock = require('./data/blocks/select.raw');
const formBlock = require('./data/blocks/form.raw');
const button = require('./data/blocks/button.raw');
const textarea = require('./data/blocks/textarea.raw');
const img = require('./data/blocks/img.raw');
const video = require('./data/blocks/video.raw');
const section = require('./data/blocks/section.raw');
const text = require('./data/blocks/text.raw');
const rawText = require('./data/blocks/raw-text.raw');
const stamped = require('./data/blocks/stamped-io.raw');
const customCode = require('./data/blocks/custom-code.raw');
const embed = require('./data/blocks/embed.raw');
const image = require('./data/blocks/image.raw');
const columns = require('./data/blocks/columns.raw');
const onUpdate = require('./data/blocks/onUpdate.raw');
const onInit = require('./data/blocks/onInit.raw');
const onUpdateWithDeps = require('./data/blocks/onUpdateWithDeps.raw');
const multipleOnUpdate = require('./data/blocks/multiple-onUpdate.raw');
const multipleOnUpdateWithDeps = require('./data/blocks/multiple-onUpdateWithDeps.raw');
const onMount = require('./data/blocks/onMount.raw');
const rootShow = require('./data/blocks/rootShow.raw');
const contentSlotHtml = require('./data/blocks/content-slot-html.raw');
const contentSlotJsx = require('./data/blocks/content-slot-jsx.raw');
const slotJsx = require('./data/blocks/slot-jsx.raw');
const slotHtml = require('./data/blocks/slot-html.raw');
const propsType = require('./data/types/component-props-type.raw');
const propsInterface = require('./data/types/component-props-interface.raw');
const preserveTyping = require('./data/types/preserve-typing.raw');

describe('React', () => {
  test('Remove Internal mitosis package', () => {
    const component = parseJsx(basicMitosis, {
      compileAwayPackages: ['@dummy/custom-mitosis'],
    });
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('ContentSlotJSX', () => {
    const component = parseJsx(contentSlotJsx);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });
  test('ContentSlotHtml', () => {
    const component = parseJsx(contentSlotHtml);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });
  test('SlotJsx', () => {
    const component = parseJsx(slotJsx);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });
  test('SlotHtml', () => {
    const component = parseJsx(slotHtml);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });
  test('Basic', () => {
    const component = parseJsx(basic);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Ref', () => {
    const component = parseJsx(basicRef);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic ForwardRef', () => {
    const component = parseJsx(basicForwardRef);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic ForwardRef same as meta', () => {
    const component = parseJsx(basicForwardRef);
    const componentMeta = parseJsx(basicForwardRefMetadata);
    const output = componentToReact()({ component });
    const outputMeta = componentToReact()({ component: componentMeta });
    expect(output).toMatch(outputMeta);
  });

  test('Basic Ref Previous', () => {
    const component = parseJsx(basicRefPrevious);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Ref Assignment', () => {
    const component = parseJsx(basicRefAssignment);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Child Component', () => {
    const component = parseJsx(basicChildComponent);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('BasicFor', () => {
    const component = parseJsx(basicFor);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Input block', () => {
    const component = parseJsx(inputBlock);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Submit button block', () => {
    const component = parseJsx(submitButtonBlock);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Select block', () => {
    const component = parseJsx(selectBlock);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Form block', () => {
    const component = parseJsx(formBlock);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Button', () => {
    const component = parseJsx(button);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Textarea', () => {
    const component = parseJsx(textarea);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Img', () => {
    const component = parseJsx(img);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Video', () => {
    const component = parseJsx(video);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Section', () => {
    const component = parseJsx(section);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Text', () => {
    const component = parseJsx(text);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('RawText', () => {
    const component = parseJsx(rawText);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Stamped.io', () => {
    const component = parseJsx(stamped);
    const output = componentToReact({
      stylesType: 'styled-components',
      stateType: 'useState',
    })({ component });
    expect(output).toMatchSnapshot();
  });

  test('CustomCode', () => {
    const component = parseJsx(customCode);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Embed', () => {
    const component = parseJsx(customCode);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Image', () => {
    const component = parseJsx(image);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Columns', () => {
    const component = parseJsx(columns);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onUpdate', () => {
    const component = parseJsx(onUpdate);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onInit', () => {
    const component = parseJsx(onInit);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onUpdateWithDeps', () => {
    const component = parseJsx(onUpdateWithDeps);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('multipleOnUpdate', () => {
    const component = parseJsx(multipleOnUpdate);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('multipleOnnUpdateWithDeps', () => {
    const component = parseJsx(multipleOnUpdateWithDeps);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onMount & onUnMount', () => {
    const component = parseJsx(onMount);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('rootShow', () => {
    const component = parseJsx(rootShow);
    const output = componentToReact({ prettier: false })({ component });
    expect(output).toMatchSnapshot();
  });

  test('propsType', () => {
    const component = parseJsx(propsType);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('propsInterface', () => {
    const component = parseJsx(propsInterface);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });

  test('preserveTyping', () => {
    const component = parseJsx(preserveTyping);
    const output = componentToReact()({ component });
    expect(output).toMatchSnapshot();
  });
});
