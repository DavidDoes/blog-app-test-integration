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
      seedData.push(generateBlogPostData()) 
    }
    //return Promise
    return BlogPost.insertMany(seedData)
}

//seed documents created above with Faker data
function generateBlogPostData(){
    return {
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    }
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
              expect(res.body.posts).to.have.lengthOf.at.least(1)
              return BlogPosts.count()
            })
            .then(function(count){
              expect(res.body.posts).to.have.lengthOf(count)
            })
        })

        it('should return blogposts with correct fields', function(){
          //get all blogposts, ensure expected keys
          let resBlogPost
          return chai.request(app)
            .get('/posts')
            .then(function(res){
              expect(res).to.have.status(200)
              expect(res).to.be.json
              expect(res.body.posts).to.be.a('array')

              res.body.posts.forEach(function(blogpost){
                expect(blogpost).to.be.a('object')
                expect(blogpost).to.include.keys(
                  'id', 'title', 'author', 'content', 'created'
                )
              })
              resBlogPost = res.body.posts[0]
              return BlogPost.findById(resBlogPost.id)
            })
            .then(function(blogpost){
              //expect values in blogpost object to be same as in db
              expect(resBlogPost.id).to.equal(blogpost.id)
              expect(resBlogPost.title).to.equal(blogpost.title)
              expect(resBlogPost.content).to.equal(blogpost.content)
              expect(resBlogPost.created).to.equal(blogpost.created)
              expect(resBlogPost.author).to.equal(blogpost.author)
            })
        })
    })

    describe('POST endpoint', function(){
      //create new blogpost, prove has correct keys
      it ('should add new blogpost', function(){
        const newBlogPost = generateBlogPostData()
        
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
            expect(res.body.name).to.equal(newBlogPost.name)
            expect(res.body.id).to.not.be.null
            expect(res.body.title).to.equal(newBlogPost.title)
            expect(res.body.content).to.equal(newBlogPost.content)
            // expect(res.body.author).to.equal(newBlogPost.author)
          })
          .then(function(blogpost){
            expect(blogpost.title).to.equal(newBlogPost.title)
            expect(blogpost.content).to.equal(newBlogPost.content)
            // expect(blogpost.author).to.equal(newBlogPost.author)
            expect(blogpost.author.firstName).to.equal(newBlogPost.author.firstName)
            expect(blogpost.author.lastName).to.equal(newBlogPost.author.lastName)
          })
      })
    })
})