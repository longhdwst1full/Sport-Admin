import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// RULE-FA-03 / 00-modular-architecture: một feature chỉ được đọc feature khác qua public index
// (`@/features/<name>`), không đọc thẳng vào `components|pages|constants|hooks|model|...` của nó.
const noDeepFeatureImport = {
  group: ['@/features/*/*'],
  message:
    'Không import sâu vào nội bộ feature khác — chỉ import qua public index (`@/features/<tên>`). Nếu thứ cần dùng chưa export, thêm vào index.ts của feature đó.',
};

// RULE-CORE-03: app → layouts → features → foundation/shared → core/lib. Tầng thấp không được
// phụ thuộc ngược lên `@/app`.
const noAppImport = {
  group: ['@/app', '@/app/*'],
  message: 'Không phụ thuộc ngược lên @/app (RULE-CORE-03: app → layouts → features → foundation/shared → core/lib).',
};

// foundation/shared/core/lib còn không được phụ thuộc vào feature nào — chúng phải dùng được từ
// mọi feature mà không kéo theo nghiệp vụ của feature khác.
const noFeatureImport = {
  group: ['@/features', '@/features/*'],
  message: 'foundation/shared/core/lib không được phụ thuộc vào bất kỳ feature nào.',
};

export default tseslint.config(
  { ignores: ['dist', 'src/generated'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noDeepFeatureImport, noAppImport] }],
    },
  },
  {
    // WORKAROUND: vi phạm biên app→features có sẵn từ trước batch lint-boundary này.
    // `NAVIGATION_ITEMS`/`NAVIGATION_GROUP_LABELS` gộp dữ liệu điều hướng với icon JSX ngay trong
    // `app/navigation/navigation.config.tsx`; tách phần dữ liệu (không icon) xuống shared/ là hướng
    // sửa đúng nhưng đụng cả 20 mục điều hướng và nơi render sidebar — để lại làm việc riêng thay vì
    // gộp vào thay đổi lint boundary, tránh rủi ro làm hỏng menu khi không có test bảo vệ.
    files: ['src/features/roles/model/permission-tree.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}', 'src/foundation/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [noFeatureImport, noAppImport] }],
    },
  },
);
