import { GraphQLLocalStrategy, buildContext } from 'graphql-passport'

import { ApolloServer } from 'apollo-server-express'
import express from 'express'
import passport from 'passport'

passport.use(
  new GraphQLLocalStrategy((email, password, done) => {
    // Adjust this callback to your needs
    const users = User.getUsers()
    const matchingUser = users.find(
      user => email === user.email && password === user.password
    )
    const error = matchingUser ? null : new Error('no matching user')
    done(error, matchingUser)
  })
)

const app = express()
app.use(passport.initialize())

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => buildContext({ req, res, User })
})

server.applyMiddleware({ app, cors: false })

app.listen({ port: PORT }, () => {
  console.log(
    `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
  )
})
