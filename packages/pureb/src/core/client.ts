import PurebViewModel, { PurebViewModelConstructor } from './purebViewModel';

const createRoot = (
  root: HTMLElement,
  main: InstanceType<typeof PurebViewModel>
) => {
  if (!root) throw new Error();

  root.appendChild(main);
};

const createPurebComponent = <T extends Record<string | symbol, any>>(
  name: string,
  props: PurebViewModelConstructor<T>
) =>
  window.customElements.define(
    name,
    class extends PurebViewModel<T> {
      constructor() {
        super(props);
      }
    }
  );

export { createRoot, createPurebComponent };
