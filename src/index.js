import { ApolloServer, gql } from 'apollo-server-koa'
import { GraphQLLocalStrategy, buildContext } from 'graphql-passport'

import Koa from 'koa'
import passport from 'koa-passport'
import session from 'koa-session'

const users = [{ id: 1, email: 'test@example.com', password: 'pass' }]

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  const matchingUser = users.find(user => user.id === id)
  done(null, matchingUser)
})

passport.use(
  new GraphQLLocalStrategy((email, password, done) => {
    const matchingUser = users.find(user => {
      return email === user.email && password === user.password
    })
    const error = matchingUser ? null : new Error('No matching user')
    done(error, matchingUser)
  })
)

const app = new Koa()

app.use(
  session(
    {
      secret: 'test',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 600000, httpOnly: false }
    },
    app
  )
)
app.use(passport.initialize())
app.use(passport.session())

const typeDefs = gql`
  type User {
    email: String
    password: String
  }

  type Query {
    me: User
  }

  type Mutation {
    login(email: String!, password: String!): User
  }
`

const resolvers = {
  Query: {
    me: (parent, args, ctx) => {
      const user = ctx.getUser()

      if (!user) {
        throw new Error('Unauthenticated')
      }

      return user
    }
  },
  Mutation: {
    login: async (parent, { email, password }, ctx) => {
      const { user } = await ctx.authenticate('graphql-local', {
        email,
        password
      })

      ctx.login(user)

      return user
    }
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  // returns error in koa-passport
  // TypeError: Object prototype may only be an Object or null: undefined
  // see https://github.com/rkusa/koa-passport/blob/7cc1f2c18b7b5e2a965d20b14a599a9c50090fcb/lib/framework/request.js#L137
  context: ({ ctx }) => buildContext({ req: ctx.req, res: ctx.res })
})

server.applyMiddleware({ app, cors: false })

const PORT = 4000
app.listen({ port: PORT }, () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
})
