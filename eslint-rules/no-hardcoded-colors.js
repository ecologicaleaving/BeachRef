/**
 * ESLint Rule: no-hardcoded-colors
 *
 * Prevents hardcoded hex colors in components and screens.
 * Enforces use of design tokens from theme/tokens.ts
 *
 * Usage: Add to eslint.config.js
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded hex colors, enforce design tokens',
      category: 'Design System',
      recommended: true,
    },
    messages: {
      hardcodedColor: 'Hardcoded color "{{color}}" found. Use design tokens instead (e.g., neutrals.textPrimary, brandBlue[500]).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'File patterns where hardcoded colors are allowed (e.g., theme files, tests)',
          },
          allowedColors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific hex colors that are allowed (e.g., #FFFFFF for pure white in shadows)',
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    const allowedFiles = options.allowedFiles || [
      '**/theme/**',
      '**/tokens.ts',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/scripts/**',
    ];
    const allowedColors = options.allowedColors || [];

    // Hex color regex: matches #RGB, #RRGGBB, #RRGGBBAA
    const HEX_COLOR_REGEX = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b/g;

    // Check if current file is allowed
    const filename = context.getFilename();
    const isAllowedFile = allowedFiles.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    });

    if (isAllowedFile) {
      return {}; // Skip this file
    }

    return {
      // Check string literals
      Literal(node) {
        if (typeof node.value !== 'string') return;

        const matches = node.value.match(HEX_COLOR_REGEX);
        if (!matches) return;

        matches.forEach((color) => {
          const normalizedColor = color.toUpperCase();

          // Skip if it's an allowed color
          if (allowedColors.includes(normalizedColor)) return;

          context.report({
            node,
            messageId: 'hardcodedColor',
            data: {
              color,
            },
          });
        });
      },

      // Check template literals
      TemplateLiteral(node) {
        node.quasis.forEach((quasi) => {
          const matches = quasi.value.raw.match(HEX_COLOR_REGEX);
          if (!matches) return;

          matches.forEach((color) => {
            const normalizedColor = color.toUpperCase();

            // Skip if it's an allowed color
            if (allowedColors.includes(normalizedColor)) return;

            context.report({
              node: quasi,
              messageId: 'hardcodedColor',
              data: {
                color,
              },
            });
          });
        });
      },
    };
  },
};
