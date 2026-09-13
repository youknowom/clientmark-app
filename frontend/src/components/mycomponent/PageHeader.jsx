import React from 'react'
import { Card, Col, Row, Image } from 'react-bootstrap'
import '../../views/sidebarCSS/comStyle.css'

function PageHeader({ pageHeaderData }) {
  const { title, disc, imgPath } = pageHeaderData
  return (
    <Card className="text-white department-header-card mainBGColor my-3">
      <Card.Body className="p-2">
        <Row className="align-items-center">
          <Col xs="auto"  className="ms-1 my-1 p-0">
            {/* <Image src={imgPath} roundedCircle width={75} height={75} alt="Department Logo" /> */}
          </Col>
          <Col>
            <h6 className="mb-0 fw-bold">{title}</h6>
            {/* <small>{disc}</small> */}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  )
}

export default PageHeader
