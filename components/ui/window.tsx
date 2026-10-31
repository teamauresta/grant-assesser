import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The title bar's classes, for other window-like frames (dialogs) to reuse. */
export const WINDOW_BAR = 'flex items-center gap-3 rounded-t-inner border-b border-border bg-neutral-bg px-3 py-2';

/** The frame's classes, without its border colour (borderClassName), for skeletons drawn like a window. */
export const WINDOW_FRAME = 'rounded-lg border bg-surface shadow-window';

const TITLE_SIZES = { sm: 'text-sm', md: 'text-base' } as const;
const PADDINGS = { md: 'p-4 md:p-6', sm: 'p-3' } as const;

/** The decorative minimise, maximise and close glyphs: hidden from assistive tech, never focusable. */
export function WindowControls() {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-2 self-start py-0.5 text-muted-fg">
      <Minus size={16} strokeWidth={1.5} />
      <Square size={16} strokeWidth={1.5} />
      <X size={16} strokeWidth={1.5} />
    </span>
  );
}

export type WindowProps = Omit<ComponentPropsWithoutRef<'section'>, 'title' | 'children' | 'className' | 'aria-labelledby' | 'aria-label'> & {
  /**
   * Not accepted: the title names the region, and a caller's name would be silently replaced (or,
   * with landmark={false}, name a plain div). Declared as never because TypeScript lets any hyphenated
   * attribute through in JSX unless the props type names it.
   */
  'aria-labelledby'?: never;
  'aria-label'?: never;
  /** The window's title: the heading that names the region. */
  title: ReactNode;
  /** The title's heading level (h2 by default). */
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  /**
   * The title's size: 'sm' (14px, default) for compact panels, 'md' (16px) where windows are the
   * sections of a page and their titles must scan as headings (the program page).
   */
  titleSize?: 'sm' | 'md';
  /** The heading's id, when something else (a dialog) points at it. Generated otherwise. */
  titleId?: string;
  /** The heading element, for callers that move focus to it. */
  headingRef?: Ref<HTMLHeadingElement>;
  /**
   * Extra attributes for the heading, such as tabIndex={-1} so script can move focus to it. Such a
   * heading is a reading start point, not a control, so it draws no focus outline.
   */
  headingProps?: Omit<ComponentPropsWithoutRef<'h2'>, 'id' | 'children' | 'className'>;
  /** Real controls for the title bar (links, buttons), shown before the decorative ones. */
  actions?: ReactNode;
  /** The decorative window glyphs (default true). */
  controls?: boolean;
  /**
   * A region landmark named by the title (default true). False renders a div, heading kept, for
   * windows that are steps in a sequence rather than parts of the page to jump to.
   */
  landmark?: boolean;
  /** The frame's border colour class. Replaces the default (cn() does not merge classes). */
  borderClassName?: string;
  /** Layout classes for the frame (margin, grid placement). */
  className?: string;
  /**
   * The body's padding: 'md' (p-4, p-6 from md up, default) or 'sm' (p-3) for narrow windows such as
   * the pipeline's columns. A prop, since cn() does not merge a caller's padding with the default.
   */
  padding?: 'md' | 'sm';
  /** Classes for the body's layout (flex, gap). */
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * A panel framed like a desktop window (Billabong design doc, section 4): a neutral title bar holding
 * the heading, over a --surface body. Nothing clips its content (focus outlines, cards moving between
 * pipeline columns), so the bar rounds its own top corners inside the frame's 1px border.
 *
 * Not a client component: useId works in Server Components too, so server pages render it as HTML
 * and it ships no JavaScript of its own. (headingRef and event handlers need a client caller.)
 */
export function Window({
  title,
  as: Heading = 'h2',
  titleSize = 'sm',
  titleId,
  headingRef,
  headingProps,
  actions,
  controls = true,
  landmark = true,
  borderClassName = 'border-border',
  className,
  padding = 'md',
  bodyClassName,
  children,
  ...rest
}: WindowProps) {
  const generated = useId();
  const id = titleId ?? generated;
  const Frame = landmark ? 'section' : 'div';
  return (
    <Frame
      {...rest}
      aria-labelledby={landmark ? id : undefined}
      className={cn(WINDOW_FRAME, borderClassName, className)}
    >
      <div className={WINDOW_BAR}>
        <Heading
          {...headingProps}
          ref={headingRef}
          id={id}
          className={cn('min-w-0 flex-1 break-words font-semibold', TITLE_SIZES[titleSize], headingProps?.tabIndex === -1 && 'focus:outline-none')}
        >
          {title}
        </Heading>
        {actions}
        {controls && <WindowControls />}
      </div>
      <div className={cn(PADDINGS[padding], bodyClassName)}>{children}</div>
    </Frame>
  );
}
