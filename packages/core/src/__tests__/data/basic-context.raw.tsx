import {
  useState,
  useContext,
  onInit,
  setContext,
  onMount,
} from '@builder.io/mitosis';
import { Injector, createInjector, MyService } from '@dummy/injection-js';

export default function MyBasicComponent() {
  setContext(Injector, createInjector());

  const myService = useContext(MyService);
  const state = useState({
    name: 'PatrickJS',
  });

  onInit(() => {
    const hi = myService.method('hi');
    console.log(hi);
  });

  onMount(() => {
    const bye = myService.method('hi');
    console.log(bye);
  });

  function onChange() {
    const change = myService.method('change');
    console.log(change);
  }

  return (
    <div>
      {myService.method('hello') + state.name}
      Hello! I can run in React, Vue, Solid, or Liquid!
      <input onChange={onChange}></input>
    </div>
  );
}
