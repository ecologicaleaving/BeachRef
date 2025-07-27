import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
(global as unknown as { TextEncoder: unknown }).TextEncoder = TextEncoder;
(global as unknown as { TextDecoder: unknown }).TextDecoder = TextDecoder;