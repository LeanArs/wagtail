import { Application } from '@hotwired/stimulus';
import { DropdownController } from './DropdownController';

jest.useFakeTimers();

describe('DropdownController', () => {
  let application;

  const setup = async (
    html = `
<section>
  <div id="dropdown" data-controller="w-dropdown" data-w-dropdown-theme-value="dropdown" data-action="custom:show->w-dropdown#show custom:hide->w-dropdown#hide">
    <button id="toggle" type="button" data-w-dropdown-target="toggle" aria-label="Actions"></button>
    <div data-w-dropdown-target="content">
      <a href="/">Option</a>
    </div>
  </div>
</section>`,
  ) => {
    document.body.innerHTML = html;

    application = Application.start();
    application.register('w-dropdown', DropdownController);

    await Promise.resolve();

    // set all animation durations to 0 so that tests can ignore animation delays
    // Tippy relies on transitionend which is not yet supported in JSDom
    // https://github.com/jsdom/jsdom/issues/1781

    document
      .querySelectorAll('[data-controller="w-dropdown"]')
      .forEach((element) => {
        application
          .getControllerForElementAndIdentifier(element, 'w-dropdown')
          .tippy.setProps({ duration: 0 }); // tippy will merge props with whatever has already been set
      });
  };

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    application?.stop();
  });
  

  it('initialises Tippy.js on connect and shows content in a dropdown', () => {
    const toggle = document.querySelector('[data-w-dropdown-target="toggle"]');
    const content = document.querySelector(
      '[data-w-dropdown-target="content"]',
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(content).toBe(null);

    toggle.dispatchEvent(new Event('click'));

    const expandedContent = document.querySelectorAll('[role="tooltip"]');
    expect(expandedContent).toHaveLength(1);

    expect(expandedContent[0].innerHTML).toContain('<a href="/">Option</a>');
  });

  it('supports providing a theme to Tippy.js', () => {
    const toggle = document.querySelector('[data-w-dropdown-target="toggle"]');
    expect(toggle._tippy.props.theme).toBe('dropdown');
  });

  it('triggers custom event on activation', async () => {
    const toggle = document.querySelector('[data-w-dropdown-target="toggle"]');
    const dropdownElement = document.querySelector(
      '[data-controller="w-dropdown"]',
    );

    const mock = new Promise((resolve) => {
      document.addEventListener('w-dropdown:shown', (event) => {
        resolve(event);
      });
    });

    toggle.dispatchEvent(new Event('click'));

    const event = await mock;

    expect(event).toEqual(
      expect.objectContaining({
        type: 'w-dropdown:shown',
        target: dropdownElement,
      }),
    );
  });

  it("1. should keep the tooltip open if clickaway event is cancelled", async () => {
    const toggle = document.getElementById('toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.dispatchEvent(new Event('click'));
  
    await jest.runAllTimersAsync();
  
    // check the tooltip is open
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  
    // click event that cancels clickaway
    document
      .querySelector('section')
      .dispatchEvent(new Event('click', {bublles: true, button: 0, cancelable: true}));
  
    await jest.runAllTimersAsync();
  
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it("2. should keep the tooltip hidden when clicking outside the reference element", async () => {
    const toggle = document.getElementById('toggle');
  
    // check the tooltip is close
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  
    // now click outside the tooltip
    document
      .querySelector('section')
      .dispatchEvent(new Event('click'));
  
    await jest.runAllTimersAsync();
  
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it("3. shouldn't hide the tooltip when clicking outside the reference element", async () => {
    const toggle = document.getElementById('toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.dispatchEvent(new Event('click'));

    await jest.runAllTimersAsync();

    // check the tooltip is open
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  
    // now click outside the tooltip
    document
      .querySelector('section')
      .dispatchEvent(new Event('click'));
  
    await jest.runAllTimersAsync();
  
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it("4. should hide the tooltip when clicking on the toggle button", async () => {
    const toggle = document.getElementById('toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.dispatchEvent(new Event('click'));

    await jest.runAllTimersAsync();

    // check the tooltip is open
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    // now click outside the tooltip
    toggle.dispatchEvent(new Event('click'));

    await jest.runAllTimersAsync();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

  it("should ensure the tooltip closes on 'esc' keydown", async () => {
    const toggle = document.getElementById('toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.dispatchEvent(new Event('click'));

    await jest.runAllTimersAsync();

    // check the tooltip is open
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    // now press the escape key
    document
      .querySelector('section')
      .dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }),
      );

    await Promise.resolve();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('should support methods to show and hide the dropdown', async () => {
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);

    const dropdownElement = document.querySelector(
      '[data-controller="w-dropdown"]',
    );

    dropdownElement.dispatchEvent(new CustomEvent('custom:show'));

    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

    dropdownElement.dispatchEvent(new CustomEvent('custom:hide'));

    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(0);
  });

  it('should support an offset value passed to tippy.js', async () => {
    application?.stop();
    document
      .querySelector('div')
      .setAttribute('data-w-dropdown-offset-value', '[12,24]');

    application = Application.start();
    application.register('w-dropdown', DropdownController);

    await Promise.resolve();

    const tippy = application.getControllerForElementAndIdentifier(
      document.querySelector('div'),
      'w-dropdown',
    ).tippy;

    expect(tippy.props).toHaveProperty('offset', [12, 24]);
  });

  describe('with keep-mounted-value set to true', () => {
    beforeEach(async () => {
      application?.stop();
      await setup(`
        <section>
          <div data-controller="w-dropdown" data-w-dropdown-theme-value="dropdown" data-w-dropdown-keep-mounted-value="true" data-action="custom:show->w-dropdown#show custom:hide->w-dropdown#hide">
            <button id="toggle" type="button" data-w-dropdown-target="toggle" aria-label="Actions"></button>
            <div data-w-dropdown-target="content">
              <a href="/">Option</a>
            </div>
          </div>
        </section>`);
    });

    it('initialises Tippy.js on connect and keeps the content mounted in the DOM', async () => {
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      const toggle = document.querySelector(
        '[data-w-dropdown-target="toggle"]',
      );
      await Promise.resolve();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      const content = document.querySelector(
        '[data-controller="w-dropdown"] [data-w-dropdown-target="content"]',
      );
      expect(content.innerHTML).toContain('<a href="/">Option</a>');

      toggle.dispatchEvent(new Event('click'));

      const expandedContent = document.querySelectorAll('[role="tooltip"]');
      expect(expandedContent).toHaveLength(1);

      expect(expandedContent[0].innerHTML).toContain('<a href="/">Option</a>');
    });

    it('should support methods to show and hide the dropdown while keeping the content in the DOM', async () => {
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

      const dropdownElement = document.querySelector(
        '[data-controller="w-dropdown"]',
      );

      dropdownElement.dispatchEvent(new CustomEvent('custom:show'));

      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

      dropdownElement.dispatchEvent(new CustomEvent('custom:hide'));

      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);

      const toggle = document.querySelector(
        '[data-w-dropdown-target="toggle"]',
      );
      const content = document.querySelector(
        '[data-controller="w-dropdown"] [data-w-dropdown-target="content"]',
      );
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(content.innerHTML).toContain('<a href="/">Option</a>');
    });
  });
});
