let db = {
	users   : [
		{
			userId    : 'jashd677as5d65sadas',
			email     : 'user@email.com',
			handle    : 'user',
			createdAt : '2019-09-13T17:23:30.123Z',
			imgUrl    : 'https://direction.to/image',
			bio       : 'This is my Bio',
			website   : 'http://google.es',
			location  : 'Londo, UK'
		}
	],
	screams : [
		{
			userHandle   : 'user',
			body         : 'this is the scream body',
			createdAt    : '2019-09-13T17:23:30.123Z',
			likeCount    : 5,
			commentCount : 6
		}
	],
	comments: [
		{
			userHandle: 'user',
			screamId: 'kkjsdhhh73jhsdda7',
			body: 'I´m a comment',
			createdAt: '2019-09-13T17:23:30.123Z',
		}
	]
};

const userDetails = {
	//Redux data
	credentials : {
		userId    : 'jashd677as5d65sadas',
		email     : 'user@email.com',
		handle    : 'user',
		createdAt : '2019-09-13T17:23:30.123Z',
		imgUrl    : 'https://direction.to/image',
		bio       : 'This is my Bio',
		website   : 'http://google.es',
		location  : 'Londo, UK'
	},
	likes       : [
		{
			userHandle : 'user',
			screamId   : '3FDS3jj5kIosdsNBYG'
		},
		{
			userHandle : 'user',
			screamId   : '3FDS3jj5kIosdsNBYG'
		}
	]
};
