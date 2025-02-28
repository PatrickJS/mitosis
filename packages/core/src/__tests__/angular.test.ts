import { componentToAngular } from '../generators/angular';
import { parseJsx } from '../parsers/jsx';

const multipleOnUpdate = require('./data/blocks/multiple-onUpdate.raw');
const onUpdate = require('./data/blocks/onUpdate.raw');
const onMount = require('./data/blocks/onMount.raw');
const onInitonMount = require('./data/blocks/onInit-onMount.raw');
const onInit = require('./data/blocks/onInit.raw');
const basicFor = require('./data/basic-for.raw');
const basicForwardRef = require('./data/basic-forwardRef.raw');
const basicForwardRefMetadata = require('./data/basic-forwardRef-metadata.raw');
const basicRefAssignment = require('./data/basic-ref-assignment.raw');
const basicRefPrevious = require('./data/basic-ref-usePrevious.raw');
const basic = require('./data/basic.raw');
const basicRef = require('./data/basic-ref.raw');
const basicContext = require('./data/basic-context.raw');
const basicChildComponent = require('./data/basic-child-component.raw');
const basicOutputsMeta = require('./data/basic-outputs-meta.raw');
const basicOutputs = require('./data/basic-outputs.raw');
// const basicOnUpdateReturn = require('./data/basic-onUpdate-return.raw');
const contentSlotHtml = require('./data/blocks/content-slot-html.raw');
const contentSlotJsx = require('./data/blocks/content-slot-jsx.raw');
const slotJsx = require('./data/blocks/slot-jsx.raw');
const classNameJsx = require('./data/blocks/classname-jsx.raw');
const text = require('./data/blocks/text.raw');
// const slotHtml = require('./data/blocks/slot-html.raw');

describe('Angular', () => {
  test('Basic', () => {
    const component = parseJsx(basic);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Ref', () => {
    const component = parseJsx(basicRef);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic ForwardRef', () => {
    const component = parseJsx(basicForwardRef);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic ForwardRef same as meta', () => {
    const component = parseJsx(basicForwardRef);
    const componentMeta = parseJsx(basicForwardRefMetadata);
    const output = componentToAngular()({ component });
    const outputMeta = componentToAngular()({ component: componentMeta });
    expect(output).toMatch(outputMeta);
  });

  test('Basic Ref Assignment', () => {
    const component = parseJsx(basicRefAssignment);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Ref Previous', () => {
    const component = parseJsx(basicRefPrevious);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  // test('Basic onUpdate return', () => {
  //   const component = parseJsx(basicOnUpdateReturn);
  //   const output = componentToAngular()({ component });
  //   expect(output).toMatchSnapshot();
  // });

  test('Basic Context', () => {
    const component = parseJsx(basicContext);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Basic Child Component', () => {
    const component = parseJsx(basicChildComponent);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('basic outputs meta', () => {
    const component = parseJsx(basicOutputsMeta);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });
  test('basic outputs', () => {
    const component = parseJsx(basicOutputs);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });
  test('basic outputs same as meta', () => {
    const component = parseJsx(basicOutputs);
    const componentMeta = parseJsx(basicOutputsMeta);
    const output = componentToAngular()({ component });
    const outputMeta = componentToAngular()({ component: componentMeta });
    expect(output).toMatch(outputMeta);
  });

  test('multiple onUpdate', () => {
    const component = parseJsx(multipleOnUpdate);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onUpdate', () => {
    const component = parseJsx(onUpdate);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onMount', () => {
    const component = parseJsx(onMount);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onInit and onMount', () => {
    const component = parseJsx(onInitonMount);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('onInit', () => {
    const component = parseJsx(onInit);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('BasicFor', () => {
    const component = parseJsx(basicFor);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('ng-content and Slot', () => {
    const component = parseJsx(contentSlotHtml);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('ng-content and Slot jsx-props', () => {
    const component = parseJsx(contentSlotJsx);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Slot Jsx', () => {
    const component = parseJsx(slotJsx);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });
  // test('Slot Html', () => {
  //   const component = parseJsx(slotHtml);
  //   const output = componentToAngular()({ component });
  //   expect(output).toMatchSnapshot();
  // });

  test('className to class', () => {
    const component = parseJsx(classNameJsx);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });

  test('Text', () => {
    const component = parseJsx(text);
    const output = componentToAngular()({ component });
    expect(output).toMatchSnapshot();
  });
});
