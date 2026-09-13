
import { Card, Col, Row } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

function PageMenus({ menus }) {
  const navigate = useNavigate();
  return (
    <Row className="g-3 ">
      {menus.map((item, index) => (
        <Col key={index} xs={6} sm={6} md={4} lg={3}>
          <Card className="d-flex flex-row align-items-center p-2 shadow border-0 rounded h-100 " style={{cursor:'pointer'}}
          onClick={()=> navigate(item.link)}
          >
            <div
              className="d-flex align-items-center p-2 justify-content-center rounded"
              style={{
                width: 50,
                height: 50,
                backgroundColor: item.bg,
              }}
            >
              {item.icon}
            </div>
            <div className="ms-3 small fw-semibold">{item.label}</div>
          </Card>
        </Col>
      ))}
    </Row>

    // <Row className="g-3">
    //   {menus.map((menu, index) => (
    //     <Col key={index} xs={6} sm={4} md={3}>
    //       <Card
    //         onClick={() => window.location.href = menu.link}
    //         style={{ backgroundColor: menu.bg, cursor: 'pointer' }}
    //         className="shadow-sm border-0 h-100"
    //       >
    //         <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center p-3">
    //           <div className="mb-2">{menu.icon}</div>
    //           <div className="fw-semibold small text-center">{menu.label}</div>
    //         </Card.Body>
    //       </Card>
    //     </Col>
    //   ))}
    // </Row>
  )
}

export default PageMenus
