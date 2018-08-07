'use strict'

const chai = require('chai')
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')

const expect = chai.expect

const {BlogPost} = require('../models')
const {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config')

chai.use(chai.http)

//seed random documents to db for testing
function seedBlogpostData(){
    console.info('seeding blogpost data')
    const seedData = [] //empty array to populate

    for (let i=1; i<=10; i++){ //populate empty arr w/ Faker documents
        seedData.push(generateBlogpostData()) 
    }
    //return Promise
    return BlogPost.insertMany(seedData)
}

//seed documents created above with Faker data
function generateBlogpostData(){
    return {
        title: faker.lorem.words(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
    },
        content: faker.lorem.paragraph(),
        created: faker.date.past()
    }
}

//delete entire db after each test
function tearDownDb(){
    console.warn('Deleting database')
    return mongoose.connection.dropDatabase()
}

describe('Blogposts API resource', function(){
    before(function(){
        return runServer(TEST_DATABASE_URL)
    })

    beforeEach(function(){
        return seedBlogpostData()
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
                  expect(res.body.blogposts).to.have.lengthOf.at.least(1)
                  return Blogposts.count()
              })
              .then(function(count){
                  expect(res.body.blogposts).to.have.lengthOf(count)
              })
        })

        it('should return blogposts with correct fields', function(){
          //get all blogposts, ensure expected keys
          let getBlogpost
          return chai.request(app)
            .get('/posts')
            .then(function(res){
              expect(res).to.have.status(200)
              expect(res).to.be.json
              expect(res.body.blogposts).to.be.a('array')

              res.body.blogposts.forEach(function(blogpost){
                expect(blogpost).to.be.a('object')
                expect(blogpost).to.include.keys(
                  'id', 'title', 'author', 'content', 'created'
                )
              })
              resBlogpost = res.body.blogposts[0]
              return Blogpost.findById(resBlogpost.id)
            })
            .then(function(blogpost){
              //expect values in blogpost object to be same as in db
              expect(resBlogpost.id).to.equal(blogpost.id)
              expect(resBlogpost.title).to.equal(blogpost.title)
              expect(resBlogpost.content).to.equal(blogpost.content)
              expect(resBlogpost.created).to.equal(blogpost.created)
              expect(resBlogpost.author).to.equal(blogpost.author)
            })
        })
    })

    describe('POST endpoint', function(){
      
    })
})