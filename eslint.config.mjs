// @ts-check

import antfu from '@antfu/eslint-config'

export default antfu({
	formatters: true,
	stylistic: {
		indent: 'tab',
	},
	typescript: {
		overrides: {
			'dot-notation': 'off',
		},
	},
})
