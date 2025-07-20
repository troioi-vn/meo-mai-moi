# Linting Errors

Below are the current linting errors found after running `npm run build` (which includes linting):

---

**/frontend/src/components/CatPhotoManager.test.tsx**
- 31:7   error  'mockedApi' is assigned a value but never used  `@typescript-eslint/no-unused-vars`
- 32:7   error  'mockedToast' is assigned a value but never used  `@typescript-eslint/no-unused-vars`
- 38:13  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 39:13  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 41:13  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 42:13  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 78:15  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 88:14  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 105:15  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`
- 115:14  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`

**/frontend/src/components/CatsSection.test.tsx**
- 44:34  error  Unexpected empty arrow function  `@typescript-eslint/no-empty-function`

**/frontend/src/components/ChangePasswordForm.test.tsx**
- 6:10  error  'useAuth' is defined but never used  `@typescript-eslint/no-unused-vars`
- 124:67  error  Unexpected empty arrow function  `@typescript-eslint/no-empty-function`

**/frontend/src/components/EnhancedCatRemovalModal.test.tsx**
- 5:15  error  'Cat' is defined but never used  `@typescript-eslint/no-unused-vars`

**/frontend/src/components/LoginForm.test.tsx**
- 2:32  error  'vi' is defined but never used  `@typescript-eslint/no-unused-vars`

**/frontend/src/components/NotificationBell.test.tsx**
- 28:15  error  Avoid referencing unbound methods which may cause unintentional scoping of `this`. If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead  `@typescript-eslint/unbound-method`

**/frontend/src/components/RegisterForm.test.tsx**
- 6:10  error  'http' is defined but never used  `@typescript-eslint/no-unused-vars`
- 6:16  error  'HttpResponse' is defined but never used  `@typescript-eslint/no-unused-vars`
- 7:10  error  'server' is defined but never used  `@typescript-eslint/no-unused-vars`

**/frontend/src/mocks/data/cats.ts**
- 130:91  error  Async arrow function has no 'await' expression  `@typescript-eslint/require-await`

**/frontend/src/mocks/handlers.ts**
- 48:13  error  Empty block statement  `no-empty`
- 72:13  error  Empty block statement  `no-empty`

**/frontend/src/pages/CatProfilePage.test.tsx**
- 66:25  error  Invalid type "number" of template literal expression  `@typescript-eslint/restrict-template-expressions`
- 152:7   error  Unexpected `await` of a non-Promise (non-"Thenable") value  `@typescript-eslint/await-thenable`
- 152:13  error  Placing a void expression inside another expression is forbidden. Move it to its own statement instead  `@typescript-eslint/no-confusing-void-expression`
- 175:7   error  Unexpected `await` of a non-Promise (non-"Thenable") value  `@typescript-eslint/await-thenable`
- 175:13  error  Placing a void expression inside another expression is forbidden. Move it to its own statement instead  `@typescript-eslint/no-confusing-void-expression`
- 179:7   error  Unexpected `await` of a non-Promise (non-"Thenable") value  `@typescript-eslint/await-thenable`
- 179:13  error  Placing a void expression inside another expression is forbidden. Move it to its own statement instead  `@typescript-eslint/no-confusing-void-expression`

**/frontend/src/pages/NotFoundPage.test.tsx**
- 4:8  error  'NotFoundPage' is defined but never used  `@typescript-eslint/no-unused-vars`

**/frontend/src/pages/ProfilePage.test.tsx**
- 14:5  error  'mockNavigate' is never reassigned. Use 'const' instead  `prefer-const`

**/frontend/src/pages/RegisterPage.test.tsx**
- 3:3  error  Unsafe return of a value of type error  `@typescript-eslint/no-unsafe-return`

**/frontend/src/pages/account/CreateCatPage.test.tsx**
- 54:11  error  Unsafe argument of type error typed assigned to a parameter of type `JsonBodyType`  `@typescript-eslint/no-unsafe-argument`

**/frontend/src/pages/account/EditCatPage.test.tsx**
- 8:13  error  'CatApi' is defined but never used  `@typescript-eslint/no-unused-vars`
- 18:3   error  Unsafe return of a value of type error  `@typescript-eslint/no-unsafe-return`
- 20:22  error  Unsafe return of a value of type `any`  `@typescript-eslint/no-unsafe-return`
- 104:61  error  Async arrow function has no 'await' expression  `@typescript-eslint/require-await`
- 142:5   error  Unexpected `await` of a non-Promise (non-"Thenable") value  `@typescript-eslint/await-thenable`

**/frontend/src/pages/account/EditCatPage.tsx**
- 64:13  error  Unnecessary conditional, value is always falsy  `@typescript-eslint/no-unnecessary-condition`
- 64:13  error  Prefer using an optional chain expression instead, as it's more concise and easier to read  `@typescript-eslint/prefer-optional-chain`
- 210:49  error  void operator shouldn't be used on void; it should convey that a return value is being ignored  `@typescript-eslint/no-meaningless-void-operator`
- 210:54  error  Placing a void expression inside another expression is forbidden. Move it to its own statement instead  `@typescript-eslint/no-confusing-void-expression`

**/frontend/src/pages/account/MyCatsPage.tsx**
- 71:15  error  Unnecessary conditional, value is always truthy  `@typescript-eslint/no-unnecessary-condition`

**/frontend/src/test-utils.tsx**
- 18:11  error  'CustomRenderOptions' is defined but never used  `@typescript-eslint/no-unused-vars`
- 27:7   error  Fast refresh only works when a file only exports components. Move your component(s) to a separate file  `react-refresh/only-export-components`
- 69:1   error  This rule can't verify that `export *` only exports components  `react-refresh/only-export-components`

---

**Summary:**
- 46 problems (46 errors, 0 warnings)
- 3 errors and 0 warnings potentially fixable with the `--fix` option.
