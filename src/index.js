import { ApolloServer, gql } from 'apollo-server-express'
import { GraphQLLocalStrategy, buildContext } from 'graphql-passport'

import express from 'express'
import passport from 'passport'
import session from 'express-session'

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

const app = express()
app.use(
  session({
    secret: 'test',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000, httpOnly: false }
  })
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
  context: ({ req, res }) => buildContext({ req, res })
})

server.applyMiddleware({ app, cors: false })

const PORT = 4000
app.listen({ port: PORT }, () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
})
