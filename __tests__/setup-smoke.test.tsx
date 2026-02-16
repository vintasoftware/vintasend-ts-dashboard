import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Smoke tests - Phase 1', () => {
  it('shadcn Button component renders correctly', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('Button component has correct text content', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByRole('button', { name: /test button/i })).toBeInTheDocument();
  });

  it('Button component can be disabled', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });
});
