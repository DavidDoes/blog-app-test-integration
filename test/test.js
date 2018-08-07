'use strict'

const chai = require('chai')
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')

const expect = chai.expect

const {BlogPost} = require('../models')
const {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config')

chai.use(chaiHttp)

//seed random documents to db for testing
function seedBlogPostData(){
    console.info('seeding blogpost data')
    const seedData = [] //empty array to populate

    for (let i=1; i<=10; i++){ //populate empty arr w/ Faker documents
      seedData.push({
        author: {
          firstName: faker.name.firstName(),
          lastName: faker.name.lastName()
      },
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph()
      })
    }
    //return Promise
    return BlogPost.insertMany(seedData)
}

//delete entire db after each test
function tearDownDb(){
    console.warn('Deleting database')
    return mongoose.connection.dropDatabase()
}

describe('BlogPosts API resource', function(){
    before(function(){
        return runServer(TEST_DATABASE_URL)
    })

    beforeEach(function(){
        return seedBlogPostData()
    })

    afterEach(function(){
        return tearDownDb()
    })

    after(function(){
        return closeServer()
    })

    //nested describe blocks for clearer tests
    describe ('GET endpoint', function(){
        it ('should return all existing blogposts', function(){
          // 1. GET all blogposts
          // 2. prove res has correct status and data type
          // 3. prove number of blogposts get back is equal to number in db
          let res //declare here to give access to all .then()
          return chai.request(app)
              .get('/posts')
              .then(function(_res){
                  res = _res
                  expect(res).to.have.status(200)
                  expect(res.body).to.have.lengthOf.at.least(1)
                  return BlogPost.count()
              })
              .then(function(count){
                  expect(res.body).to.have.lengthOf(count)
              })
        })

        it('should return blogposts with correct fields', function(){
          //get all blogposts, ensure expected keys
          let resPost
          return chai.request(app)
            .get('/posts')
            .then(function(res){
              expect(res).to.have.status(200)
              expect(res).to.be.json
              expect(res.body).to.be.a('array')
              expect(res.body).to.have.lengthOf.at.least(1)

              res.body.forEach(function(blogpost){
                expect(blogpost).to.be.a('object')
                expect(blogpost).to.include.keys(
                  'id', 'title', 'author', 'content'
                )
              })
              resPost = res.body[0]
              return BlogPost.findById(resPost.id)
            })
            .then(function(blogpost){
              //expect values in blogpost object to be same as in db
              expect(resPost.title).to.equal(blogpost.title)
              expect(resPost.content).to.equal(blogpost.content)
              expect(resPost.author).to.equal(blogpost.authorName)
            })
        })
    })

    describe('POST endpoint', function(){
      //create new blogpost, prove has correct keys
      it ('should add new blogpost', function(){
        const newBlogPost = {
          author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
          },
          title: faker.lorem.sentence(),
          content: faker.lorem.text()
        }
        
        return chai.request(app)
          .post('/posts')
          .send(newBlogPost)
          .then(function(res){
            expect(res).to.have.status(201)
            expect(res).to.be.json
            expect(res.body).to.be.a('object')
            expect(res.body).to.include.keys(
              'id', 'title', 'content', 'author'
            )
            expect(res.body.id).to.not.be.null
            expect(res.body.title).to.equal(newBlogPost.title)
            expect(res.body.content).to.equal(newBlogPost.content)
            expect(res.body.author).to.be.equal(
              `${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`
            )
            return BlogPost.findById(res.body.id)
          })
          .then(function(blogpost){
            expect(blogpost.title).to.equal(newBlogPost.title)
            expect(blogpost.content).to.equal(newBlogPost.content)
            expect(blogpost.author.firstName).to.equal(newBlogPost.author.firstName)
            expect(blogpost.author.lastName).to.equal(newBlogPost.author.lastName)
          })
      })
    })

    describe('PUT endpoint', function(){
      // 1. get existing blogpost
      // 2. make PUT req to update that post
      // 3. prove post returned contains data we sent
      // 4. prove post in db correctly updated
      it ('should update fields sent', function(){
        const updateData = {
          title: 'lorem',
          content: 'ipsum',
          author: {
            firstName: 'Lorn',
            lastName: 'Ipson'
          }
        }
        return BlogPost
          .findOne()
          .then(function(blogpost){
            updateData.id = blogpost.id
            //get and ensure same as data sent
            return chai.request(app)
              .put(`/posts/${blogpost.id}`)
              .send(updateData)
          })
          .then(function(res){
            expect(res).to.have.status(204)
            return BlogPost.findById(updateData.id)
          })
          .then(function(blogpost){
            expect(blogpost.title).to.equal(updateData.title)
            expect(blogpost.content).to.equal(updateData.content)
            expect(blogpost.author.firstName).to.equal(updateData.author.firstName)
            expect(blogpost.author.lastName).to.equal(updateData.author.lastName)
          })
      })
    })
})